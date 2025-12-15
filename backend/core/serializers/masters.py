from rest_framework import serializers
from core.models import (
    CustomerClass, Shop, Region, Gender, Color,
    Manufacturer, VehicleCategory, RegistrationLocation
)
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
        fields = ["id", "code", "name"]


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
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "display_name",   # ✅ 表示名
            "login_id",       # ✅ ログインID
            "shop",           # ✅ 所属店舗（ID）
            "shop_name",      # ✅ 店舗名（リードオンリー）
            "role",           # ✅ 権限（staff / admin）
            "password",       # ✅ パスワード
            "is_active",      # ✅ 有効フラグ
        ]
        extra_kwargs = {
            "login_id": {"required": True},
            "display_name": {"required": True},  # ✅ 表示名を必須化（UIに合わせる）
            "shop": {"required": False, "allow_null": True},
            "role": {"required": False},
        }

    def create(self, validated_data):
        """スタッフ登録時（新規作成）"""
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        user.set_password(password or "password123")  # ✅ デフォルトパスワード設定
        user.save()
        return user

    def update(self, instance, validated_data):
        """スタッフ編集時"""
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
