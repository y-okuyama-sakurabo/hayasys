# core/serializers/unit.py

from rest_framework import serializers
from core.models.unit import Unit


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ["id", "name"]