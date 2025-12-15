# core/serializers/products.py
from rest_framework import serializers
from core.models import ProductCategoryLarge, ProductCategoryMiddle, ProductCategorySmall, Product


class ProductCategoryLargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategoryLarge
        fields = ["id", "name"]


class ProductCategoryMiddleSerializer(serializers.ModelSerializer):
    large = ProductCategoryLargeSerializer(read_only=True)

    class Meta:
        model = ProductCategoryMiddle
        fields = ["id", "name", "large"]


class ProductCategorySmallSerializer(serializers.ModelSerializer):
    middle = ProductCategoryMiddleSerializer(read_only=True)

    class Meta:
        model = ProductCategorySmall
        fields = ["id", "name", "middle"]


class ProductSerializer(serializers.ModelSerializer):
    small = ProductCategorySmallSerializer(read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "unit_price", "tax_type", "small"]
