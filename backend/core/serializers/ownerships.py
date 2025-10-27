from rest_framework import serializers
from core.models import CustomerVehicle
from core.serializers.vehicles import VehicleDetailSerializer, VehicleWriteSerializer

class CustomerVehicleSerializer(serializers.ModelSerializer):
    vehicle = VehicleDetailSerializer(read_only=True)

    class Meta:
        model = CustomerVehicle
        fields = ["id", "vehicle", "owned_from", "owned_to", "created_at", "updated_at"]

class CustomerVehicleCreateSerializer(serializers.ModelSerializer):
    vehicle = VehicleWriteSerializer()

    class Meta:
        model = CustomerVehicle
        fields = ["id", "vehicle", "owned_from", "owned_to"]

    def create(self, validated_data):
        vehicle_data = validated_data.pop("vehicle")
        # ここを修正: Serializerを経由して保存する
        vehicle_serializer = VehicleWriteSerializer(data=vehicle_data)
        vehicle_serializer.is_valid(raise_exception=True)
        vehicle = vehicle_serializer.save()

        return CustomerVehicle.objects.create(vehicle=vehicle, **validated_data)
