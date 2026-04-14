# core/serializers/insurance.py

from rest_framework import serializers
from core.models.insurance import Insurance


class InsuranceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insurance
        fields = [
            "id",
            "company_name",
            "bodily_injury",
            "property_damage",
            "passenger",
            "vehicle",
            "option",
        ]