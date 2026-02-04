from rest_framework import serializers
from core.models.categories import Product
from core.serializers.categories import CategoryBreadcrumbSerializer

class ProductSerializer(serializers.ModelSerializer):
    category = CategoryBreadcrumbSerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "unit_price",
            "tax_type",
            "category",
        ]
