from rest_framework import serializers
from core.models.estimate_vehicle import EstimateVehicle
from core.models.categories import Manufacturer, Category
from core.serializers.manufacturers import ManufacturerSerializer
from core.serializers.categories import CategorySerializer
from core.models.customers import CustomerVehicle
from core.models.masters import Color
from core.serializers.estimate_vehicle_registrations import (
    EstimateVehicleRegistrationSerializer
)

class EstimateVehicleSerializer(serializers.ModelSerializer):
    estimate = serializers.PrimaryKeyRelatedField(read_only=True)

    registrations = EstimateVehicleRegistrationSerializer(
        many=True,
        read_only=True
    )

    manufacturer = serializers.PrimaryKeyRelatedField(
        queryset=Manufacturer.objects.all(),
        required=False,
        allow_null=True,
    )

    manufacturer_detail = ManufacturerSerializer(
        source="manufacturer",
        read_only=True,
    )

    color = serializers.PrimaryKeyRelatedField(
        queryset=Color.objects.all(),
        required=False,
        allow_null=True,
    )

    category = CategorySerializer(read_only=True)

    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        required=False,
        allow_null=True,
        write_only=True,
    )

    unit_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        write_only=True,
        required=False,
        allow_null=True,
    )

    source_customer_vehicle = serializers.PrimaryKeyRelatedField(
        queryset=CustomerVehicle.objects.all(),
        required=False,
        allow_null=True,
    )

    source_customer_vehicle_id = serializers.IntegerField(
        source="source_customer_vehicle.id",
        read_only=True,
    )

    class Meta:
        model = EstimateVehicle
        fields = [
            "id",
            "estimate",
            "is_trade_in",
            "category",
            "category_id",
            "unit_price",
            "source_customer_vehicle",
            "source_customer_vehicle_id",
            "vehicle_name",
            "displacement",
            "model_year",
            "sale_type",
            "manufacturer",
            "manufacturer_detail",
            "color",
            "color_name",
            "color_code",
            "model_code",
            "chassis_no",
            "engine_type",
            "created_at",
            "updated_at",
            "registrations",
        ]
        read_only_fields = [
            "id",
            "estimate",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):

        chassis_no = data.get("chassis_no")

        if not chassis_no:
            return data

        chassis_no = chassis_no.strip()

        qs = EstimateVehicle.objects.filter(
            chassis_no__iexact=chassis_no
        )

        # =========================
        # 🔥 自分自身のID取得
        # =========================
        current_id = None

        # 通常のupdate
        if self.instance:
            current_id = self.instance.id

        # nested時（ここが超重要）
        if current_id is None:
            raw_id = getattr(self, "initial_data", {}).get("id")
            if raw_id not in (None, "", "null"):
                try:
                    current_id = int(raw_id)
                except (TypeError, ValueError):
                    pass

        if current_id:
            qs = qs.exclude(id=current_id)

        # =========================
        # 🔥 同一見積を除外
        # =========================
        estimate_id = None

        # 通常のupdate
        if self.instance and getattr(self.instance, "estimate", None):
            estimate_id = self.instance.estimate.id

        # nested時
        if estimate_id is None:
            raw_estimate = getattr(self, "initial_data", {}).get("estimate")
            if raw_estimate not in (None, "", "null"):
                try:
                    estimate_id = int(raw_estimate)
                except (TypeError, ValueError):
                    pass

        if estimate_id:
            qs = qs.exclude(estimate_id=estimate_id)

        # =========================
        # 🔥 重複チェック
        # =========================
        if qs.exists():
            raise serializers.ValidationError({
                "chassis_no": "この車台番号は既に登録されています"
            })

        return data