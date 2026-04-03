from rest_framework import serializers
from core.models import EstimateVehicleRegistration


class EstimateVehicleRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimateVehicleRegistration
        fields = [
            "id",
            "registration_area",
            "registration_no",
            "certification_no",
            "inspection_expiration",
            "first_registration_date",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]