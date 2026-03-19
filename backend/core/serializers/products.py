from rest_framework import serializers
from core.models.categories import Product, Category
from core.serializers.categories import CategoryBreadcrumbSerializer
from core.serializers.manufacturers import ManufacturerSerializer
from core.models import Manufacturer


class ProductSerializer(serializers.ModelSerializer):

    # ----------------------------
    # Category
    # ----------------------------
    category = CategoryBreadcrumbSerializer(read_only=True)

    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True,
    )

    # ----------------------------
    # Manufacturer
    # ----------------------------
    manufacturer = serializers.PrimaryKeyRelatedField(
        queryset=Manufacturer.objects.all(),
        required=False,
        allow_null=True,
    )

    manufacturer_detail = ManufacturerSerializer(
        source="manufacturer",
        read_only=True,
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "unit_price",
            "tax_type",
            "category",
            "category_id",
            "manufacturer",
            "manufacturer_detail",
        ]
