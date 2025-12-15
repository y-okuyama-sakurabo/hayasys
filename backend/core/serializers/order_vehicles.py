# core/serializers/order_vehicles.py
from rest_framework import serializers
from core.models.order_vehicle import OrderVehicle
from core.models.masters import Manufacturer
from core.serializers.masters import ManufacturerSerializer



class OrderVehicleSerializer(serializers.ModelSerializer):
    manufacturer = ManufacturerSerializer(read_only=True)

    class Meta:
        model = OrderVehicle
        fields = [
            "id",
            "order",
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
