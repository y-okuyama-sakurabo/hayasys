from decimal import Decimal, InvalidOperation
from rest_framework import serializers
from core.models import EstimateItem, Product
from core.serializers.products import ProductSerializer


class EstimateItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source="product",        # Modelの外部キー "product" に紐づける
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = EstimateItem
        fields = [
            "id",
            "estimate",
            "product",
            "product_id",    
            "name",
            "quantity",
            "unit_price",
            "discount",
            "tax_type",
            "subtotal",
            "staff",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "estimate", "subtotal", "created_at", "updated_at"]

    def validate(self, data):
        """数量・単価・値引から小計を自動計算"""
        try:
            qty = Decimal(str(data.get("quantity") or "1"))
            price = Decimal(str(data.get("unit_price") or "0"))
            discount = Decimal(str(data.get("discount") or "0"))
        except InvalidOperation:
            raise serializers.ValidationError("数量・単価・値引の値が不正です")

        data["subtotal"] = (qty * price) - discount
        return data
