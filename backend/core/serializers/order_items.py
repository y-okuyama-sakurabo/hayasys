# core/serializers/orders.py
from decimal import Decimal, InvalidOperation
from rest_framework import serializers
from core.models import Order, OrderItem, Customer, Estimate
from core.serializers.products import ProductSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.none(),  # 後で差し替え
        source="product",
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_id",
            "name",
            "quantity",
            "unit_price",
            "tax_type",
            "discount",
            "subtotal",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "subtotal", "created_at", "updated_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Product の queryset を遅延セット（循環 import 回避）
        from core.models import Product
        self.fields["product_id"].queryset = Product.objects.all()

    def validate(self, data):
        """数量 × 単価 − 値引 で小計を自動計算"""
        try:
            qty = Decimal(str(data.get("quantity") or "1"))
            price = Decimal(str(data.get("unit_price") or "0"))
            discount = Decimal(str(data.get("discount") or "0"))
        except InvalidOperation:
            raise serializers.ValidationError("数量・単価・値引の値が不正です")

        data["subtotal"] = (qty * price) - discount
        return data
