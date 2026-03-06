from decimal import Decimal, InvalidOperation
from django.db.models import Sum
from decimal import Decimal, ROUND_HALF_UP
from rest_framework import serializers
from core.models import EstimateItem, Product, Category, Manufacturer
from core.serializers.categories import CategorySerializer
from core.serializers.manufacturers import ManufacturerSerializer


class EstimateItemSerializer(serializers.ModelSerializer):

    # =========================
    # Category
    # =========================
    category = CategorySerializer(read_only=True)

    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True,
    )

    # =========================
    # Manufacturer
    # =========================
    manufacturer = serializers.PrimaryKeyRelatedField(
        queryset=Manufacturer.objects.all(),
        required=False,
        allow_null=True,
    )

    manufacturer_detail = ManufacturerSerializer(
        source="manufacturer",
        read_only=True,
    )

    # =========================
    # UI専用フラグ
    # =========================
    saveAsProduct = serializers.BooleanField(
        write_only=True,
        required=False,
        default=False,
    )

    class Meta:
        model = EstimateItem
        fields = [
            "id",
            "item_type",
            "estimate",
            "category",
            "category_id",
            "manufacturer",
            "manufacturer_detail",
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

    # =========================
    # バリデーション（subtotal計算）
    # =========================
    def validate(self, data):
        try:
            qty = Decimal(str(data.get("quantity") or "1"))
            price = Decimal(str(data.get("unit_price") or "0"))
            discount = Decimal(str(data.get("discount") or "0"))
        except InvalidOperation:
            raise serializers.ValidationError("数量・単価・値引の値が不正です")

        data["subtotal"] = (qty * price) - discount
        return data

    # =========================
    # 作成
    # =========================
    def create(self, validated_data):
        save_flag = validated_data.pop("saveAsProduct", False)

        item = EstimateItem.objects.create(**validated_data)

        # 🔥 Estimate再計算
        self._recalculate_estimate(item.estimate)

        # Productマスタ登録（任意）
        if save_flag and item.name and item.category_id:
            Product.objects.get_or_create(
                name=item.name,
                category=item.category,
                manufacturer=item.manufacturer,
                defaults={
                    "unit_price": item.unit_price,
                    "tax_type": item.tax_type,
                    "is_active": True,
                },
            )

        return item

    # =========================
    # 更新
    # =========================
    def update(self, instance, validated_data):
        validated_data.pop("saveAsProduct", None)

        instance = super().update(instance, validated_data)

        # 🔥 Estimate再計算
        self._recalculate_estimate(instance.estimate)

        return instance

    # =========================
    # 🔥 見積合計再計算
    # =========================
    def _recalculate_estimate(self, estimate):
        items = estimate.items.all()

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

        estimate.subtotal = subtotal
        estimate.tax_total = tax_total
        estimate.grand_total = subtotal + tax_total

        estimate.save(update_fields=[
            "subtotal",
            "tax_total",
            "grand_total"
        ])