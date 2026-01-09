from rest_framework import serializers
from django.utils import timezone
from core.models import CustomerVehicle, Vehicle
from core.serializers.vehicles import VehicleDetailSerializer, VehicleListSerializer  # 既存に合わせて使う

class CustomerVehicleReadSerializer(serializers.ModelSerializer):
    # タブ一覧は軽くしたいなら VehicleListSerializer
    # 詳細は VehicleDetailSerializer
    vehicle = VehicleListSerializer(read_only=True)
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = CustomerVehicle
        fields = ["id", "customer", "owned_from", "owned_to", "is_current", "vehicle", "created_at", "updated_at"]

    def get_is_current(self, obj):
        return obj.owned_to is None


class VehicleCreateInOwnershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = [
            "vehicle_name", "displacement", "model_year", "new_car_type",
            "manufacturer", "category", "color",
            "model_code", "chassis_no",
            "color_name", "color_code", "engine_type",
        ]


class CustomerVehicleWriteSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.IntegerField(required=False, write_only=True)
    vehicle = VehicleCreateInOwnershipSerializer(required=False, write_only=True)

    class Meta:
        model = CustomerVehicle
        fields = ["vehicle_id", "vehicle", "owned_from", "owned_to"]

    def validate(self, attrs):
        if ("vehicle_id" not in attrs) and ("vehicle" not in attrs):
            raise serializers.ValidationError("vehicle_id または vehicle のどちらかを指定してください。")
        if ("vehicle_id" in attrs) and ("vehicle" in attrs):
            raise serializers.ValidationError("vehicle_id と vehicle は同時に指定できません。")
        return attrs

    def create(self, validated_data):
        customer = self.context["customer"]

        # owned_from を未指定なら今日（MVP）
        if not validated_data.get("owned_from"):
            validated_data["owned_from"] = timezone.now().date()

        vehicle_id = validated_data.pop("vehicle_id", None)
        vehicle_data = validated_data.pop("vehicle", None)

        if vehicle_id:
            vehicle = Vehicle.objects.get(pk=vehicle_id)
        else:
            vehicle = Vehicle.objects.create(**vehicle_data)

        # 二重登録ガード（owned_fromがNULLユニークにならない問題の対策にもなる）
        if CustomerVehicle.objects.filter(
            customer=customer, vehicle=vehicle, owned_from=validated_data["owned_from"]
        ).exists():
            raise serializers.ValidationError("同一の車両・開始日ですでに登録されています。")

        return CustomerVehicle.objects.create(customer=customer, vehicle=vehicle, **validated_data)
