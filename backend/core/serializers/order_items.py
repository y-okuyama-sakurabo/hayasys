from decimal import Decimal, InvalidOperation
from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import OrderItem, Category, Product
from core.serializers.products import ProductSerializer

User = get_user_model()


class OrderItemSerializer(serializers.ModelSerializer):
    # ==================================================
    # Product（read / write 分離）
    # ==================================================
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source="product",
        write_only=True,
        required=False,
        allow_null=True,
    )

    # ==================================================
    # Category（read / write 分離）
    # ==================================================
    category = serializers.SerializerMethodField(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True,
    )

    # --- ★ 担当者（User） ---
    staff = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )

    # ==================================================
    # UI専用フラグ（DBには保存しない）
    # ==================================================
    saveAsProduct = serializers.BooleanField(
        write_only=True,
        required=False,
        default=False,
    )

    class Meta:
        model = OrderItem
        fields = [
            "id",

            # product
            "product",
            "product_id",

            # category
            "category",
            "category_id",

            # item fields
            "name",
            "quantity",
            "unit_price",
            "tax_type",
            "discount",
            "sale_type",
            "subtotal",

            "staff",  

            # UI flag
            "saveAsProduct",

            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "subtotal",
            "created_at",
            "updated_at",
        ]

    # ==================================================
    # 表示用カテゴリ
    # ==================================================
    def get_category(self, obj):
        if not obj.category:
            return None
        return {
            "id": obj.category.id,
            "name": obj.category.name,
        }

    # ==================================================
    # バリデーション & 小計計算
    # ==================================================
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

    # ==================================================
    # create（POST）
    # ==================================================
    def create(self, validated_data):
        # ★ UI専用フラグは model に無いので必ず除外
        validated_data.pop("saveAsProduct", None)
        return super().create(validated_data)

    # ==================================================
    # update（PUT / PATCH）★ ここが今回の事故ポイント
    # ==================================================
    def update(self, instance, validated_data):
        # ★ PUT/PATCH 時も必ず除外しないと TypeError になる
        validated_data.pop("saveAsProduct", None)
        return super().update(instance, validated_data)
