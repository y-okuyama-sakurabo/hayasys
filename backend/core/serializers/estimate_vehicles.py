# core/serializers/estimate_vehicles.py
from rest_framework import serializers
from core.models.estimate_vehicle import EstimateVehicle

class EstimateVehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimateVehicle
        fields = [
            "id",
            "estimate",
            "is_trade_in",
            "vehicle_name",
            "displacement",
            "model_year",
            "new_car_type",
            "manufacturer",
            "color_name",
            "color_code",
            "model_code",
            "chassis_no",
            "engine_type",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
