from django.utils import timezone
from rest_framework import serializers

from core.models import CustomerVehicle, Vehicle
from core.serializers.vehicles import VehicleDetailSerializer, VehicleWriteSerializer


class CustomerVehicleSerializer(serializers.ModelSerializer):
    vehicle = VehicleDetailSerializer(read_only=True)
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = CustomerVehicle
        fields = [
            "id",
            "vehicle",
            "owned_from",
            "owned_to",
            "is_current",
            "created_at",
            "updated_at",
        ]

    def get_is_current(self, obj):
        return obj.owned_to is None


class CustomerVehicleWriteSerializer(serializers.ModelSerializer):
    """
    PATCH/PUT 用（所有期間のみ更新）
    vehicle を更新したいなら別APIに分けるのが安全
    """
    class Meta:
        model = CustomerVehicle
        fields = ["owned_from", "owned_to"]


class CustomerVehicleCreateSerializer(serializers.ModelSerializer):
    """
    POST 用
    - vehicle_id で既存Vehicle紐付け
    - vehicle で新規Vehicle作成
    """
    vehicle_id = serializers.IntegerField(required=False, write_only=True)
    vehicle = VehicleWriteSerializer(required=False, write_only=True)

    class Meta:
        model = CustomerVehicle
        fields = ["id", "vehicle_id", "vehicle", "owned_from", "owned_to"]

    def validate(self, attrs):
        has_vehicle_id = "vehicle_id" in attrs
        has_vehicle_obj = "vehicle" in attrs

        if not has_vehicle_id and not has_vehicle_obj:
            raise serializers.ValidationError("vehicle_id または vehicle のどちらかを指定してください。")
        if has_vehicle_id and has_vehicle_obj:
            raise serializers.ValidationError("vehicle_id と vehicle は同時に指定できません。")

        return attrs

    def create(self, validated_data):
        # view から save(customer=customer) で入る想定
        customer = validated_data.pop("customer")

        # owned_from 未指定なら今日（NULL運用による重複事故も減る）
        owned_from = validated_data.get("owned_from") or timezone.now().date()
        validated_data["owned_from"] = owned_from

        vehicle_id = validated_data.pop("vehicle_id", None)
        vehicle_data = validated_data.pop("vehicle", None)

        if vehicle_id:
            try:
                vehicle = Vehicle.objects.get(pk=vehicle_id)
            except Vehicle.DoesNotExist:
                raise serializers.ValidationError({"vehicle_id": "指定された車両が存在しません。"})
        else:
            vehicle_serializer = VehicleWriteSerializer(data=vehicle_data)
            vehicle_serializer.is_valid(raise_exception=True)
            vehicle = vehicle_serializer.save()

        # 二重登録ガード（同じ車両・同じ開始日）
        if CustomerVehicle.objects.filter(
            customer=customer,
            vehicle=vehicle,
            owned_from=owned_from,
        ).exists():
            raise serializers.ValidationError("同じ車両・開始日で既に登録されています。")

        return CustomerVehicle.objects.create(customer=customer, vehicle=vehicle, **validated_data)
