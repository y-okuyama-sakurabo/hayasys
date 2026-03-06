# core/serializers/estimate_vehicles.py

from rest_framework import serializers
from core.models.estimate_vehicle import EstimateVehicle
from core.models.categories import Manufacturer
from core.serializers.manufacturers import ManufacturerSerializer
from core.models.customers import CustomerVehicle


class EstimateVehicleSerializer(serializers.ModelSerializer):

    estimate = serializers.PrimaryKeyRelatedField(read_only=True)

    manufacturer = serializers.PrimaryKeyRelatedField(
        queryset=Manufacturer.objects.all(),
        required=False,
        allow_null=True,
    )

    manufacturer_detail = ManufacturerSerializer(
        source="manufacturer",
        read_only=True
    )

    # =========================
    # 🔥 追加（Item作成用 write_only）
    # =========================
    category_id = serializers.IntegerField(
        write_only=True,
        required=False,
        allow_null=True,
    )

    unit_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        write_only=True,
        required=False,
        allow_null=True,
    )

    # =========================
    # 所有車両関連
    # =========================
    source_customer_vehicle = serializers.PrimaryKeyRelatedField(
        queryset=CustomerVehicle.objects.all(),
        required=False,
        allow_null=True,
    )

    source_customer_vehicle_id = serializers.IntegerField(
        source="source_customer_vehicle.id",
        read_only=True
    )

    class Meta:
        model = EstimateVehicle
        fields = [
            "id",
            "estimate",
            "is_trade_in",

            # 🔥 Item作成用
            "category_id",
            "unit_price",

            # 所有車両
            "source_customer_vehicle",
            "source_customer_vehicle_id",

            "vehicle_name",
            "displacement",
            "model_year",
            "new_car_type",
            "manufacturer",
            "manufacturer_detail",
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
            "estimate",
            "created_at",
            "updated_at",
        ]