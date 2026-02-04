from decimal import Decimal, InvalidOperation
from rest_framework import serializers
from core.models import EstimateItem, Product, Category
from core.serializers.categories import CategorySerializer


class EstimateItemSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True,
    )

    # UI専用フラグ
    saveAsProduct = serializers.BooleanField(
        write_only=True,
        required=False,
        default=False,
    )

    class Meta:
        model = EstimateItem
        fields = [
            "id",
            "estimate",
            "category",
            "category_id",
            "name",
            "quantity",
            "unit_price",
            "discount",
            "tax_type",
            "sale_type",
            "subtotal",
            "staff",
            "staff_id",
            "saveAsProduct",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "estimate",
            "subtotal",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        try:
            qty = Decimal(str(data.get("quantity") or "1"))
            price = Decimal(str(data.get("unit_price") or "0"))
            discount = Decimal(str(data.get("discount") or "0"))
        except InvalidOperation:
            raise serializers.ValidationError("数量・単価・値引の値が不正です")

        data["subtotal"] = (qty * price) - discount
        return data

    def create(self, validated_data):
        # 👇 UIフラグはここで回収
        save_flag = validated_data.pop("saveAsProduct", False)

        item = EstimateItem.objects.create(**validated_data)

        # 👇 Product マスタ登録
        if save_flag and item.name and item.category_id:
            Product.objects.get_or_create(
                name=item.name,
                category=item.category,
                defaults={
                    "unit_price": item.unit_price,
                    "tax_type": item.tax_type,
                    "is_active": True,
                },
            )

        return item
