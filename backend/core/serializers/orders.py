from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model

from core.models import (
    Order,
    OrderItem,
    Customer,
    Shop,
    Payment,
)
from core.models.order_vehicle import OrderVehicle
from core.models.categories import Manufacturer
from core.serializers.order_items import OrderItemSerializer
from core.serializers.payment import PaymentSerializer
from core.serializers.customers import CustomerWriteSerializer

User = get_user_model()


# ==========================================
# 作成者
# ==========================================
class CreatedBySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "display_name", "login_id", "role"]


# ==========================================
# OrderSerializer
# ==========================================
class OrderSerializer(serializers.ModelSerializer):

    # -------------------------
    # 顧客
    # -------------------------
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
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

    new_customer = serializers.JSONField(
        write_only=True,
        required=False,
        allow_null=True,
    )

    # -------------------------
    # 明細
    # -------------------------
    items = OrderItemSerializer(many=True, required=False)

    # -------------------------
    # 支払い
    # -------------------------
    payments = PaymentSerializer(many=True, required=False)

    # -------------------------
    # 車両
    # -------------------------
    target_vehicle = serializers.JSONField(
        write_only=True, required=False, allow_null=True
    )
    trade_in_vehicle = serializers.JSONField(
        write_only=True, required=False, allow_null=True
    )

    created_by = CreatedBySerializer(read_only=True)

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

    # ==========================================================
    # Utility
    # ==========================================================

    def _create_customer_from_new(self, data):

        # 🔥 必ず最初に削除
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

    def _create_payments(self, order, payments_data):
        order_ct = ContentType.objects.get_for_model(Order)

        for p in payments_data:
            Payment.objects.create(
                content_type=order_ct,
                object_id=order.id,
                **p,
            )

    def _create_vehicle_and_item(self, order, raw_vehicle):

        if not raw_vehicle:
            OrderItem.objects.filter(
                order=order,
                item_type="vehicle",
            ).delete()
            return

        vehicle_data = raw_vehicle.copy()

        unit_price = vehicle_data.pop("unit_price", 0)
        category_id = vehicle_data.pop("category_id", None)

        if "manufacturer" in vehicle_data and isinstance(vehicle_data["manufacturer"], int):
            vehicle_data["manufacturer"] = Manufacturer.objects.filter(
                id=vehicle_data["manufacturer"]
            ).first()

        vehicle = OrderVehicle.objects.create(
            order=order,
            is_trade_in=False,
            **vehicle_data,
        )

        # 🔥 ここが重要
        OrderItem.objects.filter(
            order=order,
            item_type="vehicle",
        ).delete()

        if order.vehicle_mode == "sale":

            quantity = 1
            discount = 0

            subtotal = (unit_price * quantity) - discount

            OrderItem.objects.create(
                order=order,
                item_type="vehicle",
                category_id=category_id,
                name=vehicle.vehicle_name or "",
                quantity=quantity,
                unit_price=unit_price,
                discount=discount,
                subtotal=subtotal,  # 🔥 追加
                tax_type="taxable",
                sale_type=vehicle.new_car_type,
            )

    # ==========================================================
    # CREATE
    # ==========================================================
    def create(self, validated_data):

        print("🔥 OrderSerializer.create() 呼ばれました")

        new_customer_data = validated_data.pop("new_customer", None)
        items_data = validated_data.pop("items", [])
        payments_data = validated_data.pop("payments", [])

        raw_target_vehicle = validated_data.pop("target_vehicle", None)
        raw_trade_in_vehicle = validated_data.pop("trade_in_vehicle", None)

        # ======================================================
        # 顧客決定ロジック
        # ======================================================

        if new_customer_data:

            source_customer_id = new_customer_data.get("source_customer")

            if source_customer_id:
                # 🔥 既存顧客を使う
                try:
                    validated_data["customer"] = Customer.objects.get(
                        id=source_customer_id
                    )
                except Customer.DoesNotExist:
                    raise serializers.ValidationError({
                        "customer": "指定された顧客が存在しません"
                    })

            else:
                # 🔥 source_customer が無い → 新規作成
                validated_data["customer"] = self._create_customer_from_new(
                    new_customer_data
                )

        customer = validated_data.get("customer")

        if not customer:
            raise serializers.ValidationError(
                {"customer": ["顧客が必要です"]}
            )

        # ======================================================
        # 顧客スナップショット
        # ======================================================

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

        # ======================================================
        # Order 作成
        # ======================================================

        order = Order.objects.create(**validated_data)

        # ======================================================
        # 明細（vehicle は除外）
        # ======================================================

        for item in items_data:
            item.pop("saveAsProduct", None)

            if item.get("item_type") == "vehicle":
                continue

            OrderItem.objects.create(order=order, **item)

        # ======================================================
        # 支払い
        # ======================================================

        self._create_payments(order, payments_data)

        # ======================================================
        # 車両作成
        # ======================================================

        self._create_vehicle_and_item(order, raw_target_vehicle)

        if raw_trade_in_vehicle:
            trade_vehicle_data = raw_trade_in_vehicle.copy()

            if (
                "manufacturer" in trade_vehicle_data
                and isinstance(trade_vehicle_data["manufacturer"], int)
            ):
                trade_vehicle_data["manufacturer"] = Manufacturer.objects.filter(
                    id=trade_vehicle_data["manufacturer"]
                ).first()

            OrderVehicle.objects.create(
                order=order,
                is_trade_in=True,
                **trade_vehicle_data,
            )
        
        # ======================================================
        # 所有車両登録（sale のときのみ）
        # ======================================================

        from core.services.order_finalize import create_customer_vehicle_from_order

        create_customer_vehicle_from_order(order)

        return order

    # ==========================================================
    # UPDATE
    # ==========================================================
    def update(self, instance, validated_data):

        new_customer_data = validated_data.pop("new_customer", None)
        items_data = validated_data.pop("items", None)
        payments_data = validated_data.pop("payments", None)

        raw_target_vehicle = validated_data.pop("target_vehicle", None)
        raw_trade_in_vehicle = validated_data.pop("trade_in_vehicle", None)

        # 顧客更新
        if new_customer_data:
            if instance.customer:
                serializer = CustomerWriteSerializer(
                    instance.customer,
                    data=new_customer_data,
                    partial=True,
                )
                serializer.is_valid(raise_exception=True)
                serializer.save()
            else:
                instance.customer = self._create_customer_from_new(
                    new_customer_data
                )

        customer = instance.customer

        instance.party_name = customer.name
        instance.party_kana = getattr(customer, "kana", None)
        instance.phone = customer.phone
        instance.email = customer.email
        instance.postal_code = customer.postal_code
        instance.address = customer.address

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        # 明細再構築
        if items_data is not None:
            instance.items.all().delete()

            for item in items_data:
                item.pop("saveAsProduct", None)

                if item.get("item_type") == "vehicle":
                    continue

                OrderItem.objects.create(order=instance, **item)

        # 支払い再構築
        if payments_data is not None:
            instance.payments.all().delete()
            self._create_payments(instance, payments_data)

        # 車両再構築
        instance.order_vehicles.all().delete()

        self._create_vehicle_and_item(
            instance, raw_target_vehicle
        )

        if raw_trade_in_vehicle:
            trade_vehicle_data = raw_trade_in_vehicle.copy()

            if "manufacturer" in trade_vehicle_data and isinstance(
                trade_vehicle_data["manufacturer"], int
            ):
                trade_vehicle_data["manufacturer"] = Manufacturer.objects.filter(
                    id=trade_vehicle_data["manufacturer"]
                ).first()

            OrderVehicle.objects.create(
                order=instance,
                is_trade_in=True,
                **trade_vehicle_data,
            )

        return instance