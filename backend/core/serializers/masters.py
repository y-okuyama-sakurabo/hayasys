from rest_framework import serializers
from core.models import CustomerClass, Shop, Region, Gender, Color, Manufacturer, VehicleCategory, RegistrationLocation
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomerClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerClass
        fields = ["id", "code", "name", "is_wholesale"]

class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = ["id", "code", "name"]

class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ["id", "code", "name"]

class GenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gender
        fields = ["id", "code", "name"]

class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "login_id"]

class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = ["id", "name"]

class ManufacturerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Manufacturer
        fields = ["id", "name"]

class VehicleCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleCategory
        fields = ["id", "name"]

class RegistrationLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationLocation
        fields = ["id", "code", "name"]