from django.utils import timezone
from rest_framework import serializers

from core.models import CustomerVehicle, Vehicle
from core.serializers.vehicles import (
    VehicleDetailSerializer,
    VehicleListSerializer,
    VehicleWriteSerializer,
)

# ==================================================
# Read（一覧・詳細表示用）
# ==================================================
class CustomerVehicleReadSerializer(serializers.ModelSerializer):
    vehicle = VehicleListSerializer(read_only=True)
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = CustomerVehicle
        fields = [
            "id",
            "customer",
            "vehicle",
            "owned_from",
            "owned_to",
            "is_current",
            "created_at",
            "updated_at",
        ]

    def get_is_current(self, obj):
        return obj.owned_to is None


# ==================================================
# Create（新規登録用）
# ==================================================
class CustomerVehicleCreateSerializer(serializers.ModelSerializer):
    """
    POST 用
    - vehicle_id: 既存Vehicleを紐付け
    - vehicle: 新規Vehicleを作成して紐付け
    """
    vehicle_id = serializers.IntegerField(required=False, write_only=True)
    vehicle = VehicleWriteSerializer(required=False, write_only=True)

    class Meta:
        model = CustomerVehicle
        fields = [
            "id",
            "vehicle_id",
            "vehicle",
            "owned_from",
            "owned_to",
        ]

    def validate(self, attrs):
        if ("vehicle_id" not in attrs) and ("vehicle" not in attrs):
            raise serializers.ValidationError(
                "vehicle_id または vehicle のどちらかを指定してください。"
            )
        if ("vehicle_id" in attrs) and ("vehicle" in attrs):
            raise serializers.ValidationError(
                "vehicle_id と vehicle は同時に指定できません。"
            )
        return attrs

    def create(self, validated_data):
        customer = self.context["customer"]

        # owned_from 未指定なら今日
        owned_from = validated_data.get("owned_from") or timezone.now().date()
        validated_data["owned_from"] = owned_from

        vehicle_id = validated_data.pop("vehicle_id", None)
        vehicle_data = validated_data.pop("vehicle", None)

        if vehicle_id:
            try:
                vehicle = Vehicle.objects.get(pk=vehicle_id)
            except Vehicle.DoesNotExist:
                raise serializers.ValidationError(
                    {"vehicle_id": "指定された車両が存在しません。"}
                )
        else:
            vehicle_serializer = VehicleWriteSerializer(data=vehicle_data)
            vehicle_serializer.is_valid(raise_exception=True)
            vehicle = vehicle_serializer.save()

        # 二重登録ガード
        if CustomerVehicle.objects.filter(
            customer=customer,
            vehicle=vehicle,
            owned_from=owned_from,
        ).exists():
            raise serializers.ValidationError(
                "同じ車両・開始日で既に登録されています。"
            )

        return CustomerVehicle.objects.create(
            customer=customer,
            vehicle=vehicle,
            **validated_data
        )


# ==================================================
# Update（所有期間変更用）
# ==================================================
class CustomerVehicleUpdateSerializer(serializers.ModelSerializer):
    """
    PATCH / PUT 用
    - 所有期間のみ変更
    """
    class Meta:
        model = CustomerVehicle
        fields = ["owned_from", "owned_to"]
