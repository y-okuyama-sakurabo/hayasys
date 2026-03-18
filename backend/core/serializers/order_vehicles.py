# core/serializers/order_vehicles.py
from rest_framework import serializers
from core.models.order_vehicle import OrderVehicle
from core.models.categories import Category
from core.serializers.masters import ManufacturerSerializer
from core.models.customers import CustomerVehicle


class OrderVehicleSerializer(serializers.ModelSerializer):
    manufacturer = ManufacturerSerializer(read_only=True)

    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
    )

    # 🔥 追加：顧客車両
    source_customer_vehicle = serializers.PrimaryKeyRelatedField(
        queryset=CustomerVehicle.objects.all(),
        required=False,
        allow_null=True,
    )

    # 🔥 フロント用（ID取得）
    source_customer_vehicle_id = serializers.IntegerField(
        source="source_customer_vehicle.id",
        read_only=True,
    )

    class Meta:
        model = OrderVehicle
        fields = [
            "id",
            "order",
            "is_trade_in",

            # 🔥 追加
            "source_customer_vehicle",
            "source_customer_vehicle_id",

            "vehicle_name",
            "displacement",
            "model_year",
            "new_car_type",
            "manufacturer",
            "category",
            "color",
            "color_name",
            "color_code",
            "model_code",
            "chassis_no",
            "engine_type",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]