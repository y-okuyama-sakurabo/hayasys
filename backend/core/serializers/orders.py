from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType

from core.models import Order, OrderItem, Customer, Shop, Payment
from core.models.order_vehicle import OrderVehicle
from core.models.masters import Manufacturer
from core.models.order_delivery_payment import Delivery
from core.serializers.order_items import OrderItemSerializer
from core.serializers.payment import PaymentSerializer
from core.serializers.customers import CustomerWriteSerializer

User = get_user_model()


class CreatedBySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "display_name", "login_id", "role"]


class OrderSerializer(serializers.ModelSerializer):

    # --- 顧客 ---
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        required=False,
        allow_null=True
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

    # --- 明細 ---
    items = OrderItemSerializer(many=True, required=False)

    # --- 支払い ---
    payments = PaymentSerializer(many=True, required=False)

    # --- 車両情報（write-only） ---
    target_vehicle = serializers.JSONField(
        write_only=True, required=False, allow_null=True
    )
    trade_in_vehicle = serializers.JSONField(
        write_only=True, required=False, allow_null=True
    )

    # --- read only ---
    created_by = CreatedBySerializer(read_only=True)
    shop = serializers.PrimaryKeyRelatedField(read_only=True)

    # 顧客スナップショット
    party_name = serializers.CharField(read_only=True)
    party_kana = serializers.CharField(read_only=True)
    phone = serializers.CharField(read_only=True)
    email = serializers.CharField(read_only=True)
    postal_code = serializers.CharField(read_only=True)
    address = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_no",
            "shop",

            "customer",
            "customer_id",
            "new_customer",

            "party_name",
            "party_kana",
            "phone",
            "email",
            "postal_code",
            "address",

            "status",
            "order_date",

            "subtotal",
            "discount_total",
            "tax_total",
            "grand_total",

            "items",
            "payments",

            "target_vehicle",
            "trade_in_vehicle",

            "estimate",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "order_no",
            "created_by",
            "created_at",
            "updated_at",
            "shop",
            "party_name",
            "party_kana",
            "phone",
            "email",
            "postal_code",
            "address",
        ]



    # --------------------------------------
    # 車両の manufacturer ID → instance に変換
    # --------------------------------------
    def _normalize_vehicle(self, data):
        if not data:
            return None

        v = data.copy()

        # manufacturer（ID → instance）
        if "manufacturer" in v:
            m = v["manufacturer"]
            if isinstance(m, int):
                v["manufacturer"] = Manufacturer.objects.filter(id=m).first()

        return v

    # --------------------------------------
    # 新規作成
    # --------------------------------------
    def create(self, validated_data):
        new_customer_data = validated_data.pop("new_customer", None)
        items_data = validated_data.pop("items", [])
        payments_data = validated_data.pop("payments", [])

        raw_target_vehicle = validated_data.pop("target_vehicle", None)
        raw_trade_in_vehicle = validated_data.pop("trade_in_vehicle", None)

        target_vehicle = self._normalize_vehicle(raw_target_vehicle)
        trade_in_vehicle = self._normalize_vehicle(raw_trade_in_vehicle)

        # 顧客作成
        if new_customer_data:
            validated_data["customer"] = self._create_customer_from_new(new_customer_data)

        customer = validated_data.get("customer")
        if not customer:
            raise serializers.ValidationError({"customer": ["顧客が必要です"]})

        # スナップショット
        validated_data.update({
            "party_name": customer.name,
            "party_kana": getattr(customer, "kana", None),
            "phone": customer.phone,
            "email": customer.email,
            "postal_code": customer.postal_code,
            "address": customer.address,
        })

        order = Order.objects.create(**validated_data)

        # 明細
        for item in items_data:
            OrderItem.objects.create(order=order, **item)

        # 支払い
        order_ct = ContentType.objects.get_for_model(Order)
        for p in payments_data:
            Payment.objects.create(
                content_type=order_ct,
                object_id=order.id,
                **p
            )

        # --- ★ 車両登録（正しい位置） ---
        if target_vehicle:
            OrderVehicle.objects.create(
                order=order,
                is_trade_in=False,
                **target_vehicle
            )

        if trade_in_vehicle:
            OrderVehicle.objects.create(
                order=order,
                is_trade_in=True,
                **trade_in_vehicle
            )

        return order

    # --------------------------------------
    # 顧客作成
    # --------------------------------------
    def _create_customer_from_new(self, data):
        fk_fields = ["customer_class", "region", "gender"]
        fk_id_updates = {}

        for fk in fk_fields:
            if fk in data:
                v = data[fk]
                if isinstance(v, int):
                    fk_id_updates[f"{fk}_id"] = v
                elif isinstance(v, str) and v.isdigit():
                    fk_id_updates[f"{fk}_id"] = int(v)
                else:
                    fk_id_updates[f"{fk}_id"] = None
                data.pop(fk, None)

        data.update(fk_id_updates)
        return Customer.objects.create(**data)

    # --------------------------------------
    # 更新
    # --------------------------------------
    def update(self, instance, validated_data):
        new_customer_data = validated_data.pop("new_customer", None)
        items_data = validated_data.pop("items", None)
        payments_data = validated_data.pop("payments", None)

        raw_target_vehicle = validated_data.pop("target_vehicle", None)
        raw_trade_in_vehicle = validated_data.pop("trade_in_vehicle", None)

        target_vehicle = self._normalize_vehicle(raw_target_vehicle)
        trade_in_vehicle = self._normalize_vehicle(raw_trade_in_vehicle)

        # 顧客更新
        if new_customer_data and instance.customer:
            customer_serializer = CustomerWriteSerializer(
                instance.customer, data=new_customer_data, partial=True
            )
            customer_serializer.is_valid(raise_exception=True)
            customer_serializer.save()
            validated_data["customer"] = instance.customer
        elif new_customer_data:
            validated_data["customer"] = self._create_customer_from_new(new_customer_data)

        customer = validated_data.get("customer", instance.customer)

        # スナップショット更新
        validated_data.update({
            "party_name": customer.name,
            "party_kana": getattr(customer, "kana", None),
            "phone": customer.phone,
            "email": customer.email,
            "postal_code": customer.postal_code,
            "address": customer.address,
        })

        # 注文ヘッダ更新
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # --- 明細 ---
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                OrderItem.objects.create(order=instance, **item)

        # --- 支払い ---
        if payments_data is not None:
            instance.payments.all().delete()
            order_ct = ContentType.objects.get_for_model(Order)
            for p in payments_data:
                Payment.objects.create(
                    content_type=order_ct,
                    object_id=instance.id,
                    **p
                )

        # --- ★ 車両更新 ---
        instance.order_vehicles.all().delete()

        if target_vehicle:
            OrderVehicle.objects.create(
                order=instance,
                is_trade_in=False,
                **target_vehicle
            )

        if trade_in_vehicle:
            OrderVehicle.objects.create(
                order=instance,
                is_trade_in=True,
                **trade_in_vehicle
            )

        return instance
    
