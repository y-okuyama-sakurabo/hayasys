from rest_framework import serializers
from core.models import OrderVehicleRegistration


class OrderVehicleRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderVehicleRegistration
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