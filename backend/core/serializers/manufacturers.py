# core/serializers/manufacturers.py
from rest_framework import serializers
from core.models.categories import Manufacturer

class ManufacturerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Manufacturer
        fields = ["id", "name"]
