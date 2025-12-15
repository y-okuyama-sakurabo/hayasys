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
from core.models.payments import Payment

from core.models import (
    Order, OrderItem,
    Estimate, EstimateItem,
    EstimateParty,
    Customer,
    Payment,
)
from core.models.base import Shop
from core.serializers.order_detail import OrderDetailSerializer
from core.serializers.orders import OrderSerializer


# ====================================================
# 共通：次の受注番号を生成
# ====================================================
def generate_next_order_no(shop):
    today_str = date.today().strftime("%Y%m%d")

    last_number = (
        Order.objects
        .filter(order_no__startswith=today_str)
        .annotate(
            number_part=Cast(Substr("order_no", len(today_str) + 2, 10), IntegerField())
        )
        .aggregate(max_number=Max("number_part"))
        .get("max_number")
    )

    next_number = (last_number or 0) + 1
    return f"{today_str}-{next_number}"


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
            .prefetch_related("items")
        )

        shop_id = self.request.query_params.get("shop_id")
        if shop_id and shop_id != "all":
            qs = qs.filter(shop_id=shop_id)

        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        shop = user.shop

        # --- 受注番号生成 ---
        order_no = serializer.validated_data.get("order_no")
        if not order_no or Order.objects.filter(order_no=order_no).exists():
            order_no = generate_next_order_no(shop)

        # --- 先に保存（items も serializer の create() で作成される） ---
        order = serializer.save(
            created_by=user,
            shop=shop,
            order_no=order_no,
        )

        # ============================
        # ★ 金額計算ここでやる
        # ============================
        subtotal = 0
        discount_total = 0

        for item in order.items.all():
            qty = float(item.quantity or 0)
            price = float(item.unit_price or 0)
            discount = float(item.discount or 0)
            subtotal += (qty * price) - discount
            discount_total += discount

        tax_total = int(subtotal * 0.1)
        grand_total = subtotal + tax_total

        order.subtotal = subtotal
        order.discount_total = discount_total
        order.tax_total = tax_total
        order.grand_total = grand_total
        order.save()


# ======================================
# 受注単体
# ======================================
class OrderRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Order.objects.all().select_related(
        "customer",
        "shop",
        "created_by",
    ).prefetch_related("items", "order_vehicles")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return OrderDetailSerializer
        return OrderSerializer

    def perform_update(self, serializer):
        staff = getattr(self.request.user, "staff", None)
        shop = getattr(staff, "shop", None)
        serializer.save(shop=shop)


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
                product=item.product,
                name=item.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                tax_type=item.tax_type,
                discount=item.discount,
                subtotal=item.subtotal,
            )

        # ===============================
        # 5. 車両コピー（EstimateVehicle → OrderVehicle）
        # ===============================
        from core.models.estimate_vehicle import EstimateVehicle
        from core.models.order_vehicle import OrderVehicle

        estimate_vehicles = EstimateVehicle.objects.filter(estimate=estimate)

        for v in estimate_vehicles:
            OrderVehicle.objects.create(
                order=order,
                is_trade_in=v.is_trade_in,
                vehicle_name=v.vehicle_name,
                displacement=v.displacement,
                model_year=v.model_year,
                new_car_type=v.new_car_type,
                manufacturer=v.manufacturer,
                color_name=v.color_name,
                color_code=v.color_code,
                model_code=v.model_code,
                chassis_no=v.chassis_no,
                engine_type=v.engine_type,
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

        # ===== 商談車両・下取り車両 =====
        vehicles = estimate.estimate_vehicles.all()

        target = None
        trade_in = None

        for v in vehicles:
            data = {
                "vehicle_name": v.vehicle_name,
                "displacement": v.displacement,
                "model_year": v.model_year,
                "new_car_type": v.new_car_type,
                "manufacturer": v.manufacturer.id if v.manufacturer else None,
                "color_name": v.color_name,
                "color_code": v.color_code,
                "model_code": v.model_code,
                "chassis_no": v.chassis_no,
                "engine_type": v.engine_type,
            }

            if v.is_trade_in:
                trade_in = data
            else:
                target = data

        # ===== 支払い情報（見積の Payment） =====
        estimate_ct = ContentType.objects.get_for_model(Estimate)
        payments = Payment.objects.filter(
            content_type=ContentType.objects.get_for_model(Estimate),
            object_id=estimate.id
        )

        payment_data = []
        for p in payments:
            payment_item = {
                "id": p.id,
                "payment_method": p.payment_method,
            }

            # クレジット詳細（クレジット選択時のみ）
            if p.payment_method == "クレジット":
                payment_item.update({
                    "credit_company": p.credit_company,
                    "credit_first_payment": p.credit_first_payment,
                    "credit_second_payment": p.credit_second_payment,
                    "credit_bonus_payment": p.credit_bonus_payment,
                    "credit_installments": p.credit_installments,
                    "credit_start_month": p.credit_start_month,
                })

            payment_data.append(payment_item)

        # ===== 返却データ =====
        data = {
            "estimate_id": estimate.id,

            "customer_candidate": {
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
                "customer_class": {
                    "id": party.customer_class.id if party.customer_class else None,
                    "name": party.customer_class.name if party.customer_class else None,
                },
                "gender": {
                    "id": party.gender.id if party.gender else None,
                    "name": party.gender.name if party.gender else None,
                },
                "region": {
                    "id": party.region.id if party.region else None,
                    "name": party.region.name if party.region else None,
                },
            },

            "items": [
                {
                    "product": item.product.id if item.product else None,
                    "name": item.name,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "tax_type": item.tax_type,
                    "discount": item.discount,
                    "subtotal": item.subtotal,

                    # ←★ カテゴリ追加
                    "category": (
                        {
                            "large": item.product.small.middle.large.name if item.product and item.product.small else None,
                            "middle": item.product.small.middle.name if item.product and item.product.small else None,
                            "small": item.product.small.name if item.product and item.product.small else None,
                        }
                        if item.product else None
                    ),
                }
                for item in estimate.items.all()
            ],


            "target_vehicle": target,
            "trade_in_vehicle": trade_in,

            "payment": payment_data,

            "totals": {
                "subtotal": estimate.subtotal,
                "discount_total": estimate.discount_total,
                "tax_total": estimate.tax_total,
                "grand_total": estimate.grand_total,
            },
        }

        return Response(data, status=200)

