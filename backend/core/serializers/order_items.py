from decimal import Decimal, InvalidOperation
from rest_framework import serializers
from core.models import OrderItem, Category, Product
from core.serializers.products import ProductSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source="product",
        write_only=True,
        required=False,
        allow_null=True
    )

    # ★ カテゴリ（read / write 分離）
    category = serializers.SerializerMethodField(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True
    )

    # ★ UI専用フラグ（DBには保存しない）
    saveAsProduct = serializers.BooleanField(
        write_only=True,
        required=False,
        default=False,
    )

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_id",

            "category",
            "category_id",

            "name",
            "quantity",
            "unit_price",
            "tax_type",
            "discount",
            "sale_type",
            "subtotal",

            # ★ UIフラグ
            "saveAsProduct",

            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "subtotal", "created_at", "updated_at"]

    def get_category(self, obj):
        if not obj.category:
            return None
        return {
            "id": obj.category.id,
            "name": obj.category.name,
        }

    def validate(self, data):
        """数量 × 単価 − 値引"""
        try:
            qty = Decimal(str(data.get("quantity") or "1"))
            price = Decimal(str(data.get("unit_price") or "0"))
            discount = Decimal(str(data.get("discount") or "0"))
        except InvalidOperation:
            raise serializers.ValidationError("数量・単価・値引の値が不正です")

        data["subtotal"] = (qty * price) - discount
        return data

    def create(self, validated_data):
        # ★ UI用フラグは model に無いので除外
        validated_data.pop("saveAsProduct", None)
        return super().create(validated_data)
