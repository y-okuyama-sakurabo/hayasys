# core/views/orders/views.py
from datetime import date
from django.db import transaction
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q, Max, IntegerField
from django.db.models.functions import Cast, Substr
from django.utils import timezone
from rest_framework import generics, permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from core.models.payments import Payment
from core.services.order_finalize import create_customer_vehicle_from_order
from django.db.models import Q
import jaconv

from core.models import (
    Order, OrderItem,
    Estimate, EstimateItem,
    EstimateParty,
    Customer,
    Payment,
    Schedule,
    Settlement,
)
from core.models.base import Shop
from core.serializers.order_detail import OrderDetailSerializer
from core.serializers.orders import OrderSerializer


# ====================================================
# 共通：次の受注番号を生成
# ====================================================
def generate_next_order_no(shop):
    year_prefix = date.today().strftime("%y")  # 2026 -> 26

    last_number = (
        Order.objects
        .filter(order_no__startswith=year_prefix)
        .annotate(
            number_part=Cast(
                Substr("order_no", 3, 5),
                IntegerField(),
            )
        )
        .aggregate(max_number=Max("number_part"))
        .get("max_number")
    )

    next_number = (last_number or 0) + 1
    return f"{year_prefix}{next_number:05d}"


# ======================================
# 受注一覧 ＋ 作成
# ======================================
class OrderListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):

        qs = (
            Order.objects.all()
            .select_related("customer", "shop", "created_by")
            .prefetch_related("items", "items__product")
        )

        # -------------------------
        # 店舗
        # -------------------------

        shop_id = self.request.query_params.get("shop_id")

        if shop_id and shop_id != "all":
            qs = qs.filter(shop_id=shop_id)

        # -------------------------
        # キーワード検索
        # -------------------------

        q = self.request.query_params.get("search")

        if q:
            q_norm = jaconv.normalize(q, "NFKC")

            qs = qs.filter(
                Q(order_no__icontains=q_norm)
                | Q(customer__name__icontains=q_norm)
                | Q(created_by__display_name__icontains=q_norm)
                | Q(items__name__icontains=q_norm)
                | Q(items__product__name__icontains=q_norm)
            ).distinct()

        # -------------------------
        # 日付範囲
        # -------------------------

        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if date_from:
            qs = qs.filter(order_date__gte=date_from)

        if date_to:
            qs = qs.filter(order_date__lte=date_to)

        # -------------------------
        # 金額範囲
        # -------------------------

        amount_min = self.request.query_params.get("amount_min")
        amount_max = self.request.query_params.get("amount_max")

        if amount_min:
            qs = qs.filter(grand_total__gte=amount_min)

        if amount_max:
            qs = qs.filter(grand_total__lte=amount_max)

        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        print("📦 perform_create 呼ばれました")

        user = self.request.user
        staff = getattr(user, "staff", None)
        user_shop = getattr(staff, "shop", None)

        shop_id = self.request.data.get("shop")

        if shop_id:
            try:
                shop = Shop.objects.get(id=shop_id)
            except Shop.DoesNotExist:
                shop = user_shop
        else:
            shop = user_shop

        order_no = serializer.validated_data.get("order_no")

        if not order_no or Order.objects.filter(order_no=order_no).exists():
            order_no = generate_next_order_no(shop)

        order = serializer.save(
            created_by=user,
            shop=shop,
            order_no=order_no,
        )
        serializer._recalculate_order(order)

# ======================================
# 受注単体
# ======================================

class OrderRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Order.objects.all().prefetch_related(
        "items",
        "items__deliveryitem_set",   # ← ここが正解
        "deliveries",
        "order_vehicles",
        "payment_management__records",
    )
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return OrderDetailSerializer
        return OrderSerializer
    
    def perform_update(self, serializer):
        user = self.request.user
        staff = getattr(user, "staff", None)
        user_shop = getattr(staff, "shop", None)

        shop_id = self.request.data.get("shop")
        if shop_id:
            try:
                shop = Shop.objects.get(id=shop_id)
            except Shop.DoesNotExist:
                shop = user_shop
        else:
            shop = user_shop

        serializer.save(shop=shop)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):

        order = self.get_object()

        # ① DeliveryItem（最初）
        for item in order.items.all():
            item.deliveryitem_set.all().delete()

        # ② Delivery
        order.deliveries.all().delete()

        # ③ OrderItem
        order.items.all().delete()

        # ④ OrderVehicle
        order.order_vehicles.all().delete()

        # ⑤ PaymentManagement
        if hasattr(order, "payment_management"):
            order.payment_management.delete()

        # ⑥ Order
        order.delete()

        return Response(status=204)



# ======================================
# 見積 → 受注作成（完成版）
# ======================================
class OrderFromEstimateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        estimate_id = request.data.get("estimate_id")
        selected_customer_id = request.data.get("selected_customer_id")

        if not estimate_id:
            return Response({"detail": "estimate_id が必要です"}, status=400)

        # 1. 見積ロード
        try:
            estimate = (
                Estimate.objects
                .select_related("party", "shop")
                .prefetch_related("items")
                .get(id=estimate_id)
            )
        except Estimate.DoesNotExist:
            return Response({"detail": "見積が存在しません"}, status=404)

        party = estimate.party
        if not party:
            return Response({"detail": "見積に顧客情報がありません"}, status=400)

        user = request.user
        shop = getattr(user.staff, "shop", None)

        # ===============================
        # 2. 顧客決定
        # ===============================
        if party.source_customer:
            # 見積作成時に紐づいていた顧客
            customer = party.source_customer

        elif selected_customer_id:
            # フロントで選択された既存顧客
            try:
                customer = Customer.objects.get(id=selected_customer_id)
            except Customer.DoesNotExist:
                return Response({"detail": "選択された顧客が存在しません"}, status=404)

        else:
            # 自動マッチング
            similar = Customer.objects.filter(
                Q(name=party.name) &
                (Q(phone=party.phone) | Q(email=party.email))
            )

            if similar.exists():
                return Response({
                    "need_customer_select": True,
                    "candidates": [
                        {
                            "id": c.id,
                            "name": c.name,
                            "phone": c.phone,
                            "email": c.email,
                            "address": c.address,
                        }
                        for c in similar
                    ]
                })

            # 新規顧客として登録
            customer = Customer.objects.create(
                name=party.name,
                kana=party.kana,
                phone=party.phone,
                email=party.email,
                mobile_phone=party.mobile_phone,
                company=party.company,
                company_phone=party.company_phone,
                birthdate=party.birthdate,
                postal_code=party.postal_code,
                address=party.address,
                customer_class=party.customer_class,
                gender=party.gender,
                region=party.region,
                first_shop=party.first_shop or estimate.shop,
                last_shop=party.last_shop or estimate.shop,
            )

            party.source_customer = customer
            party.save(update_fields=["source_customer"])

        # ===============================
        # 3. 受注作成
        # ===============================
        order = Order.objects.create(
            order_no=generate_next_order_no(shop),
            shop=shop,
            estimate=estimate,
            customer=customer,

            vehicle_mode=estimate.vehicle_mode,

            party_name=customer.name,
            party_kana=customer.kana,
            phone=customer.phone,
            email=customer.email,
            postal_code=customer.postal_code,
            address=customer.address,

            status="ordered",
            order_date=timezone.now().date(),

            # 見積金額をコピー
            subtotal=estimate.subtotal,
            discount_total=estimate.discount_total,
            tax_total=estimate.tax_total,
            grand_total=estimate.grand_total,

            created_by=user,
        )

        # ===============================
        # 4. 明細コピー
        # ===============================
        for item in estimate.items.all():
            OrderItem.objects.create(
                order=order,
                item_type=item.item_type,
                product=item.product,
                category=item.category,
                name=item.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                tax_type=item.tax_type,
                discount=item.discount,
                subtotal=item.subtotal,
                staff=item.staff,
                sale_type=item.sale_type,
                labor_cost=item.labor_cost,
                manufacturer=item.manufacturer,
            )
        
        # ===============================
        # 5. スケジュールコピー
        # ===============================
        estimate_schedules = Schedule.objects.filter(
            estimate_id=estimate.id,
        )
        if not Schedule.objects.filter(order=order).exists():
            for s in estimate_schedules:
                Schedule.objects.create(
                    schedule_type="delivery",
                    order=order,
                    customer=order.customer,
                    shop=order.shop,
                    staff=order.created_by,

                    title=s.title,
                    start_at=s.start_at,
                    end_at=s.end_at,

                    delivery_method=s.delivery_method,
                    delivery_shop=s.delivery_shop,
                    description=s.description,
                )

        # ===============================
        # 6. 支払いコピー（Estimate → Order）
        # ===============================

        estimate_ct = ContentType.objects.get_for_model(Estimate)
        order_ct = ContentType.objects.get_for_model(Order)

        estimate_payments = Payment.objects.filter(
            content_type=estimate_ct,
            object_id=estimate.id
        )

        for p in estimate_payments:
            Payment.objects.create(
                content_type=order_ct,
                object_id=order.id,
                payment_method=p.payment_method,
                credit_company=p.credit_company,
                credit_first_payment=p.credit_first_payment,
                credit_second_payment=p.credit_second_payment,
                credit_bonus_payment=p.credit_bonus_payment,
                credit_installments=p.credit_installments,
                credit_start_month=p.credit_start_month,
            )


        # ===============================
        # 7. 見積ステータス更新
        # ===============================
        estimate.status = "ordered"
        estimate.save(update_fields=["status"])

        create_customer_vehicle_from_order(order)

        serializer = OrderDetailSerializer(order, context={"request": request})
        return Response(serializer.data, status=201)

# ======================================
# 見積 → 受注作成（候補返すやつ）
# ======================================
class PrepareOrderFromEstimateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        estimate_id = request.data.get("estimate_id")
        if not estimate_id:
            return Response({"detail": "estimate_id が必要です"}, status=400)

        # ===== 見積取得 =====
        try:
            estimate = (
                Estimate.objects
                .select_related("party", "shop")
                .prefetch_related("items", "estimate_vehicles")
                .get(id=estimate_id)
            )
        except Estimate.DoesNotExist:
            return Response({"detail": "見積が存在しません"}, status=404)

        party = estimate.party
        if not party:
            return Response({"detail": "見積に顧客情報がありません"}, status=400)

        # ===== 顧客（source_customer があれば customer_id に入れる）=====
        customer_id = party.source_customer.id if party.source_customer else None

        # PartySelector が期待する new_customer の形（idは入れてOK）
        new_customer = {
            "source_customer": customer_id,
            "name": party.name,
            "kana": party.kana,
            "phone": party.phone,
            "mobile_phone": party.mobile_phone,
            "company": party.company,
            "company_phone": party.company_phone,
            "birthdate": party.birthdate,
            "email": party.email,
            "postal_code": party.postal_code,
            "address": party.address,
            # ★ PartySelectorは number を期待してる（オブジェクトじゃなくID）
            "customer_class": party.customer_class.id if party.customer_class else None,
            "region": party.region.id if party.region else None,
            "gender": party.gender.id if party.gender else None,
        }

        # ===== 車両（EstimateVehicle）=====
        vehicles = estimate.estimate_vehicles.all()
        target_vehicle = None
        trade_in_vehicle = None

        # 「車両item」から category_id / unit_price を拾う（ここが抜けてた）
        vehicle_item = estimate.items.filter(item_type="vehicle").select_related("category").first()
        vehicle_category_id = vehicle_item.category.id if vehicle_item and vehicle_item.category else None
        vehicle_unit_price = vehicle_item.unit_price if vehicle_item else 0
        vehicle_discount = vehicle_item.discount if vehicle_item else 0

        for v in vehicles:
            data = {
                "vehicle_name": v.vehicle_name,
                "displacement": v.displacement,
                "model_year": v.model_year,
                "sale_type": v.sale_type,
                "manufacturer": v.manufacturer.id if v.manufacturer else None,
                "color": v.color.id if getattr(v, "color", None) else None,
                "color_name": v.color_name,
                "color_code": v.color_code,
                "model_code": v.model_code,
                "chassis_no": v.chassis_no,
                "engine_type": v.engine_type,

                # 🔥 これ追加
                "registrations": [
                    {
                        "registration_area": r.registration_area,
                        "registration_no": r.registration_no,
                        "certification_no": r.certification_no,
                        "inspection_expiration": r.inspection_expiration,
                        "first_registration_date": r.first_registration_date,
                    }
                    for r in v.registrations.all()
                ],
                
            }

            if v.is_trade_in:
                trade_in_vehicle = data
            else:
                # ★ target側にカテゴリと価格も入れる（VehicleStepが使える）
                data["category_id"] = vehicle_category_id
                data["unit_price"] = vehicle_unit_price
                data["discount"] = vehicle_discount
                target_vehicle = data

        # ===== 支払い（見積の Payment → orderの payments 形式へ）=====
        estimate_ct = ContentType.objects.get_for_model(Estimate)
        payment = Payment.objects.filter(
            content_type=estimate_ct,
            object_id=estimate.id
        ).first()

        payment_payload = None

        if payment:
            payment_payload = {
                "credit_company": payment.credit_company,
                "credit_first_payment": payment.credit_first_payment,
                "credit_second_payment": payment.credit_second_payment,
                "credit_bonus_payment": payment.credit_bonus_payment,
                "credit_installments": payment.credit_installments,
                "credit_start_month": payment.credit_start_month,
            }
        
        estimate_ct = ContentType.objects.get_for_model(Estimate)

        settlements = Settlement.objects.filter(
            content_type=estimate_ct,
            object_id=estimate.id
        )

        settlements_payload = [
            {
                "settlement_type": s.settlement_type,
                "amount": s.amount,
            }
            for s in settlements
        ]

        # ===== items（OrderFormの buildItemPayload が期待する形に寄せる）=====
        items_payload = []
        for item in estimate.items.all():
            items_payload.append({
                "item_type": item.item_type,
                "product_id": item.product.id if item.product else None,  # ← OrderItemSerializerが product_id を持ってるなら
                "category_id": item.category.id if item.category else None,
                "name": item.name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "discount": item.discount,
                "tax_type": item.tax_type,
                "sale_type": item.sale_type,
                "staff": item.staff.id if item.staff else None,
                "labor_cost": item.labor_cost,
                "manufacturer": item.manufacturer.id if item.manufacturer else None,

                "unit": item.unit.id if item.unit else None,
            })
        
        # ===============================
        # スケジュール取得（ここ追加）
        # ===============================
        schedule = Schedule.objects.filter(
            estimate_id=estimate.id
        ).order_by("-start_at").first()

        # ===== 返却（OrderForm state.basic にそのまま入れられる形）=====
        data = {
            "estimate_id": estimate.id,
            "shop": estimate.shop.id if estimate.shop else None,
            "vehicle_mode": estimate.vehicle_mode,
            "customer_id": customer_id,
            "new_customer": new_customer,
            "items": items_payload,
            "target_vehicle": target_vehicle,
            "trade_in_vehicle": trade_in_vehicle,
            "insurance": {
                "company_name": estimate.insurance.company_name,
                "bodily_injury": estimate.insurance.bodily_injury,
                "property_damage": estimate.insurance.property_damage,
                "passenger": estimate.insurance.passenger,
                "vehicle": estimate.insurance.vehicle,
                "option": estimate.insurance.option,
            } if hasattr(estimate, "insurance") and estimate.insurance else None,

            "settlements": settlements_payload,
            "payment": payment_payload,

            "totals": {
                "subtotal": estimate.subtotal,
                "discount_total": estimate.discount_total,
                "tax_total": estimate.tax_total,
                "grand_total": estimate.grand_total,
            },
            "schedule": {
                "start_at": schedule.start_at,
                "end_at": schedule.end_at,
                "delivery_method": schedule.delivery_method,
                "delivery_shop": schedule.delivery_shop.id if schedule.delivery_shop else None,
                "description": schedule.description,
            } if schedule else None,
        }

        return Response(data, status=200)