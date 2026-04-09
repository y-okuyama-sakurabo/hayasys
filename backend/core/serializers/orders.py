from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model
from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Sum

from core.models import (
    Order,
    OrderItem,
    Customer,
    Shop,
    Payment,
    Schedule,
    Estimate,
)
from core.models.order_vehicle import OrderVehicle
from core.models.categories import Manufacturer, Category
from core.models.masters import Color
from core.models import OrderVehicleRegistration
from core.serializers.order_items import OrderItemSerializer
from core.serializers.payment import PaymentSerializer
from core.serializers.customers import CustomerWriteSerializer
from core.serializers.order_vehicles import OrderVehicleSerializer
from core.serializers.order_settlements import OrderSettlementSerializer


User = get_user_model()


class CreatedBySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "display_name", "login_id", "role"]


class OrderSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        required=False,
        allow_null=True,
    )
    settlements = OrderSettlementSerializer(many=True, required=False)

    estimate = serializers.PrimaryKeyRelatedField(
        queryset=Estimate.objects.all(),
        required=False,
        allow_null=True,
    )

    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source="customer",
        write_only=True,
        required=False,
        allow_null=True,
    )

    new_customer = serializers.JSONField(write_only=True, required=False, allow_null=True)

    items = OrderItemSerializer(many=True, required=False)
    schedule = serializers.JSONField(write_only=True, required=False, allow_null=True)
    payments = PaymentSerializer(many=True, required=False)
    schedule = serializers.SerializerMethodField()

    target_vehicle = serializers.JSONField(write_only=True, required=False, allow_null=True)
    trade_in_vehicle = serializers.JSONField(write_only=True, required=False, allow_null=True)

    created_by = CreatedBySerializer(read_only=True)

    vehicles = OrderVehicleSerializer(
        source="order_vehicles",
        many=True,
        read_only=True,
    )

    created_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="created_by",
        write_only=True,
        required=False,
        allow_null=True,
    )

    shop = serializers.PrimaryKeyRelatedField(
        queryset=Shop.objects.all(),
        required=False,
        allow_null=False,
    )

    class Meta:
        model = Order
        fields = "__all__"
        read_only_fields = [
            "order_no",
            "created_by",
            "created_at",
            "updated_at",
            "party_name",
            "party_kana",
            "phone",
            "email",
            "postal_code",
            "address",
        ]

    # =========================================
    # 共通
    # =========================================

    def _create_customer_from_new(self, data):
        data = data.copy()
        data.pop("source_customer", None)

        fk_fields = ["customer_class", "region", "gender"]
        fk_id_updates = {}

        for fk in fk_fields:
            if fk in data:
                v = data[fk]
                fk_id_updates[f"{fk}_id"] = int(v) if str(v).isdigit() else None
                data.pop(fk, None)

        data.update(fk_id_updates)
        return Customer.objects.create(**data)
    
    def get_schedule(self, obj):
        s = Schedule.objects.filter(order=obj).order_by("-id").first()

        if not s:
            return None

        return {
            "id": s.id,
            "start_at": s.start_at,
            "end_at": s.end_at,
            "delivery_method": s.delivery_method,
            "delivery_shop": s.delivery_shop.id if s.delivery_shop else None,
            "description": s.description,
        }

    def _create_payments(self, order, payments_data):
        order_ct = ContentType.objects.get_for_model(Order)

        for p in payments_data:
            Payment.objects.create(
                content_type=order_ct,
                object_id=order.id,
                **p,
            )

    def _normalize_vehicle_data(self, raw_vehicle):
        if not raw_vehicle:
            return None

        vehicle_data = raw_vehicle.copy()

        # 🔥 FK変換
        if isinstance(vehicle_data.get("manufacturer"), int):
            vehicle_data["manufacturer"] = Manufacturer.objects.filter(
                id=vehicle_data["manufacturer"]
            ).first()

        if isinstance(vehicle_data.get("color"), int):
            vehicle_data["color"] = Color.objects.filter(
                id=vehicle_data["color"]
            ).first()

        if isinstance(vehicle_data.get("category_id"), int):
            vehicle_data["category"] = Category.objects.filter(
                id=vehicle_data["category_id"]
            ).first()
            vehicle_data.pop("category_id", None)

        if isinstance(vehicle_data.get("category"), int):
            vehicle_data["category"] = Category.objects.filter(
                id=vehicle_data["category"]
            ).first()

        return vehicle_data

    # =========================================
    # 🔥 ここが超重要（修正版）
    # =========================================

    def _clean_vehicle_data(self, vehicle_data):
        if not vehicle_data:
            return None

        vehicle_data.pop("id", None)
        vehicle_data.pop("order", None)
        vehicle_data.pop("unit_price", None)
        vehicle_data.pop("discount", None)
        vehicle_data.pop("registrations", None)

        return vehicle_data

    def _upsert_target_vehicle(self, order, raw_vehicle):
        existing = order.order_vehicles.filter(is_trade_in=False).first()

        if not raw_vehicle:
            if existing:
                existing.delete()
            return

        vehicle_data = self._normalize_vehicle_data(raw_vehicle)
        vehicle_data = self._clean_vehicle_data(vehicle_data)

        if not vehicle_data:
            if existing:
                existing.delete()
            return

        if existing:
            for attr, value in vehicle_data.items():
                setattr(existing, attr, value)
            existing.is_trade_in = False
            existing.save()

            regs = raw_vehicle.get("registrations", []) if raw_vehicle else []

            if regs is not None:
                existing.registrations.all().delete()

                for reg in regs:
                    OrderVehicleRegistration.objects.create(
                        vehicle=existing,
                        registration_area=reg.get("registration_area"),
                        registration_no=reg.get("registration_no"),
                        certification_no=reg.get("certification_no"),
                        inspection_expiration=reg.get("inspection_expiration"),
                        first_registration_date=reg.get("first_registration_date"),
                    )

            return existing

        vehicle = OrderVehicle.objects.create(
            order=order,
            is_trade_in=False,
            **vehicle_data,
        )

        # 🔥 ここに移動
        regs = raw_vehicle.get("registrations", []) if raw_vehicle else []

        for reg in regs:
            OrderVehicleRegistration.objects.create(
                vehicle=vehicle,
                registration_area=reg.get("registration_area"),
                registration_no=reg.get("registration_no"),
                certification_no=reg.get("certification_no"),
                inspection_expiration=reg.get("inspection_expiration"),
                first_registration_date=reg.get("first_registration_date"),
            )

        return vehicle
    


    def _replace_trade_in_vehicle(self, order, raw_vehicle):
        order.order_vehicles.filter(is_trade_in=True).delete()

        if not raw_vehicle:
            return None

        trade_vehicle_data = self._normalize_vehicle_data(raw_vehicle)
        trade_vehicle_data = self._clean_vehicle_data(trade_vehicle_data)

        if not trade_vehicle_data:
            return None

        trade_vehicle_data.pop("category", None)
        trade_vehicle_data.pop("category_id", None)

        return OrderVehicle.objects.create(
            order=order,
            is_trade_in=True,
            **trade_vehicle_data,
        )

    # =========================================
    # CREATE
    # =========================================

    def create(self, validated_data):
        new_customer_data = validated_data.pop("new_customer", None)
        items_data = validated_data.pop("items", [])
        payments_data = validated_data.pop("payments", [])

        raw_target_vehicle = validated_data.pop("target_vehicle", None)
        raw_trade_in_vehicle = validated_data.pop("trade_in_vehicle", None)

        customer = validated_data.get("customer")

        if not customer and new_customer_data:
            source_customer_id = new_customer_data.get("source_customer")

            if source_customer_id:
                customer = Customer.objects.get(id=source_customer_id)
            else:
                customer = self._create_customer_from_new(new_customer_data)

            validated_data["customer"] = customer

        if not customer:
            raise serializers.ValidationError({"customer": ["顧客が必要です"]})

        validated_data.update(
            {
                "party_name": customer.name,
                "party_kana": getattr(customer, "kana", None),
                "phone": customer.phone,
                "email": customer.email,
                "postal_code": customer.postal_code,
                "address": customer.address,
            }
        )

        schedule_data = validated_data.pop("schedule", None)
        estimate = validated_data.get("estimate")
        settlements_data = validated_data.pop("settlements", [])

        order = Order.objects.create(**validated_data)

        
        if estimate:
            estimate.status = "ordered"
            estimate.save(update_fields=["status"])

        if schedule_data:
            Schedule.objects.create(
                schedule_type="delivery",
                order=order,
                customer=order.customer,
                shop=order.shop,
                staff=order.created_by,
                title="納車予定",
                start_at=schedule_data.get("start_at"),
                end_at=schedule_data.get("end_at"),
                delivery_method=schedule_data.get("delivery_method", ""),
                delivery_location=schedule_data.get("delivery_location", ""),
                description=schedule_data.get("note", ""),
            )

        for item in items_data:
            item.pop("saveAsProduct", None)
            OrderItem.objects.create(order=order, **item)

        for s in settlements_data:
            OrderSettlement.objects.create(order=order, **s)
            
        self._recalculate_order(order) 
        self._create_payments(order, payments_data)
        self._upsert_target_vehicle(order, raw_target_vehicle)
        self._replace_trade_in_vehicle(order, raw_trade_in_vehicle)

        return order

    # =========================================
    # UPDATE
    # =========================================

    def update(self, instance, validated_data):
        schedule_data = validated_data.pop("schedule", None)
        new_customer_data = validated_data.pop("new_customer", None)
        customer = validated_data.pop("customer", None)
        items_data = validated_data.pop("items", None)
        payments_data = validated_data.pop("payments", None)

        raw_target_vehicle = validated_data.pop("target_vehicle", None)
        raw_trade_in_vehicle = validated_data.pop("trade_in_vehicle", None)

        settlements_data = validated_data.pop("settlements", None)

        # 顧客更新
        if customer:
            instance.customer = customer
        elif new_customer_data:
            source_customer_id = new_customer_data.get("source_customer")

            if source_customer_id:
                instance.customer = Customer.objects.get(id=source_customer_id)
            else:
                if instance.customer:
                    serializer = CustomerWriteSerializer(
                        instance.customer,
                        data=new_customer_data,
                        partial=True,
                    )
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                else:
                    instance.customer = self._create_customer_from_new(new_customer_data)

        current_customer = instance.customer

        if not current_customer:
            raise serializers.ValidationError({"customer": ["顧客が必要です"]})

        instance.party_name = current_customer.name
        instance.party_kana = getattr(current_customer, "kana", None)
        instance.phone = current_customer.phone
        instance.email = current_customer.email
        instance.postal_code = current_customer.postal_code
        instance.address = current_customer.address

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        # 明細
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                item.pop("saveAsProduct", None)
                OrderItem.objects.create(order=instance, **item)
            self._recalculate_order(instance) 

        # =========================
        # 🔥 schedule更新（追加）
        # =========================
        if schedule_data is not None:
            existing = Schedule.objects.filter(order=instance).order_by("-id").first()

            if existing:
                for attr, value in schedule_data.items():
                    setattr(existing, attr, value)
                existing.save()
            else:
                Schedule.objects.create(
                    schedule_type="delivery",
                    order=instance,
                    customer=instance.customer,
                    shop=instance.shop,
                    staff=instance.created_by,
                    title="納車予定",
                    start_at=schedule_data.get("start_at"),
                    end_at=schedule_data.get("end_at"),
                    delivery_method=schedule_data.get("delivery_method", ""),
                    description=schedule_data.get("description", ""),
                )

        # 支払い
        if payments_data is not None:
            order_ct = ContentType.objects.get_for_model(Order)
            Payment.objects.filter(
                content_type=order_ct,
                object_id=instance.id,
            ).delete()
            self._create_payments(instance, payments_data)
        
        if settlements_data is not None:
            instance.settlements.all().delete()

            for s in settlements_data:
                OrderSettlement.objects.create(order=instance, **s)

        # 車両
        self._upsert_target_vehicle(instance, raw_target_vehicle)
        self._replace_trade_in_vehicle(instance, raw_trade_in_vehicle)

        return instance
    
    def _recalculate_order(self, order):
        items = order.items.all()

        subtotal = items.aggregate(
            total=Sum("subtotal")
        )["total"] or Decimal("0.00")

        taxable_subtotal = items.filter(
            tax_type="taxable"
        ).aggregate(
            total=Sum("subtotal")
        )["total"] or Decimal("0.00")

        tax_total = (taxable_subtotal * Decimal("0.10")).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP
        )

        final_adjustment = order.final_adjustment or Decimal("0")

        order.subtotal = subtotal
        order.tax_total = tax_total
        order.grand_total = subtotal + tax_total + final_adjustment

        order.save(update_fields=[
            "subtotal",
            "tax_total",
            "grand_total",
        ])