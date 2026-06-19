from rest_framework import serializers
from core.models import (
    CustomerClass, Shop, Region, Gender, Color,
    Manufacturer, VehicleCategory, RegistrationLocation
)
from core.models.base import CompanySettings
from core.models.base import ROLE_CHOICES, ROLE_GROUP_DISPLAY
from django.contrib.auth import get_user_model

User = get_user_model()

# === 各マスタ共通シリアライザ ===

class CustomerClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerClass
        fields = ["id", "code", "name", "is_wholesale"]


class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = [
            "id",
            "code",
            "name",
            "postal_code",
            "location",
            "phone",
            "fax",
            "email",
            "opening_hours",
            "closing_day",
            "note",
            "bank_name",
            "bank_branch_name",
            "bank_account_type",
            "bank_account_no",
            "bank_account_holder",
        ]

    def validate_code(self, value):
        qs = Shop.objects.filter(code=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("このコードはすでに使用されています。")
        return value


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ["id", "code", "name"]


class GenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gender
        fields = ["id", "code", "name"]


# === スタッフ（ユーザー）シリアライザ ===

class StaffSerializer(serializers.ModelSerializer):
    shop_name    = serializers.CharField(source="shop.name", read_only=True)
    shop_code    = serializers.CharField(source="shop.code", read_only=True)
    role_display = serializers.SerializerMethodField()
    # 所属表示：店舗名 or グループ名（経理総務 / 未所属）
    shop_display = serializers.SerializerMethodField()
    password     = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "display_name",
            "login_id",
            "shop",
            "shop_name",
            "shop_code",
            "shop_display",
            "role",
            "role_display",
            "password",
            "is_active",
        ]
        extra_kwargs = {
            "login_id":     {"required": True},
            "display_name": {"required": True},
            "shop":         {"required": False, "allow_null": True},
            "role":         {"required": False},
        }

    def get_role_display(self, obj):
        return dict(ROLE_CHOICES).get(obj.role, obj.role)

    def get_shop_display(self, obj):
        if obj.shop:
            return obj.shop.name
        return ROLE_GROUP_DISPLAY.get(obj.role)  # 未所属 / 経理総務 / None

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        user.set_password(password or "password123")
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


# === その他マスタ ===

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


class CompanySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySettings
        fields = ["registration_number"]
