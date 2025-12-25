# core/serializers/customers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers
from core.models import (
    Customer, CustomerVehicle, Vehicle, Shop,
    CustomerClass, Gender, Region, CustomerImage,
    CustomerMemo,
)
from .vehicles import VehicleWriteSerializer

User = get_user_model()

# ---- Tiny / Mini serializers ----
class ShopTinySerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = ("id", "name", "code")

class VehicleMiniSerializer(serializers.ModelSerializer):
    registration_no = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = (
            "id",
            "vehicle_name",
            "manufacturer",
            "category",
            "registration_no",
        )

    def get_registration_no(self, obj):
        reg = obj.registrations.first() 
        return reg.registration_no if reg else None


class CustomerClassMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerClass
        fields = ("id", "code", "name", "is_wholesale")

class GenderMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gender
        fields = ("id", "code", "name")

class RegionMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ("id", "code", "name")

class UserTinySerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "login_id", "full_name")

    def get_full_name(self, obj):
        return f"{obj.last_name} {obj.first_name}"



# ---- List ----
class CustomerListSerializer(serializers.ModelSerializer):
    owned_vehicle_count = serializers.IntegerField(read_only=True)
    first_shop = ShopTinySerializer(read_only=True)
    last_shop  = ShopTinySerializer(read_only=True)
    staff = UserTinySerializer(read_only=True, allow_null=True)

    class Meta:
        model = Customer
        fields = (
            "id", "name", "kana", "email",
            "phone", "mobile_phone",
            "first_shop", "last_shop",
            "owned_vehicle_count",
            "postal_code",
            "address",
            "staff",
        )



# ---- Detail (Read) ----
class OwnedVehicleSerializer(serializers.ModelSerializer):
    vehicle = VehicleMiniSerializer()
    class Meta:
        model = CustomerVehicle
        fields = ("id", "owned_from", "owned_to", "vehicle")

class CustomerDetailSerializer(serializers.ModelSerializer):
    customer_class = CustomerClassMiniSerializer(read_only=True, allow_null=True)
    staff         = UserTinySerializer(read_only=True, allow_null=True)
    region        = RegionMiniSerializer(read_only=True, allow_null=True)
    gender        = GenderMiniSerializer(read_only=True, allow_null=True)
    first_shop    = ShopTinySerializer(read_only=True, allow_null=True)
    last_shop     = ShopTinySerializer(read_only=True, allow_null=True)

    owned_vehicles = serializers.SerializerMethodField()

    def get_owned_vehicles(self, obj):
        qs = obj.customer_vehicles.select_related("vehicle").order_by("-owned_from", "-id")
        return OwnedVehicleSerializer(qs, many=True).data

    class Meta:
        model = Customer
        fields = (
            "id", "name", "kana", "email",
            "postal_code", "address",
            "phone", "mobile_phone",
            "company", "company_phone",
            "customer_class", "staff", "region", "gender",
            "birthdate", "first_shop", "last_shop",
            "owned_vehicles",
            "created_at", "updated_at",
        )



class CustomerWriteSerializer(serializers.ModelSerializer):

    customer_class = serializers.PrimaryKeyRelatedField(
        queryset=CustomerClass.objects.all(),
        required=True,
        allow_null=True
    )
    staff = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True),
        required=False, allow_null=True
    )
    region = serializers.PrimaryKeyRelatedField(
        queryset=Region.objects.all(),
        required=False, allow_null=True
    )
    gender = serializers.PrimaryKeyRelatedField(
        queryset=Gender.objects.all(),
        required=False, allow_null=True
    )
    first_shop = serializers.PrimaryKeyRelatedField(
        queryset=Shop.objects.all(),
        required=False, allow_null=True
    )
    last_shop = serializers.PrimaryKeyRelatedField(
        queryset=Shop.objects.all(),
        required=False, allow_null=True
    )

    vehicles = VehicleWriteSerializer(many=True, required=False)

    class Meta:
        model = Customer
        fields = (
            "name", "kana", "email",
            "postal_code", "address",
            "phone", "mobile_phone",
            "company", "company_phone",
            "customer_class", "staff", "region", "gender",
            "birthdate", "first_shop", "last_shop",
            "vehicles",
        )

    def _blank_to_none(self, v):
        return None if isinstance(v, str) and v.strip() == "" else v

    def to_internal_value(self, data):
        data = data.copy()

        for key in ("email","postal_code","address","phone","mobile_phone","company","company_phone"):
            if key in data:
                data[key] = self._blank_to_none(data[key])

        for key in ("customer_class","staff","region","gender","first_shop","last_shop"):
            if key in data and isinstance(data[key], str) and data[key].strip() == "":
                data[key] = None
        return super().to_internal_value(data)

    def validate_email(self, v):
        return v.lower() if v else v

    def validate_postal_code(self, v):
        return v.replace("-", "").strip() if v else v

    def validate_phone(self, v):
        return v.replace("-", "").strip() if v else v

    def validate_mobile_phone(self, v):
        return v.replace("-", "").strip() if v else v

    def create(self, validated_data):
        vehicles_data = validated_data.pop("vehicles", [])
        customer = super().create(validated_data)

        for vdata in vehicles_data:
            v_serializer = VehicleWriteSerializer(data=vdata)
            v_serializer.is_valid(raise_exception=True)
            vehicle = v_serializer.save()
            CustomerVehicle.objects.create(
                customer=customer,
                vehicle=vehicle,
                owned_from=customer.created_at,  # or timezone.now()
            )
        return customer

class CustomerImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerImage
        fields = ["id", "customer", "image", "mime", "width", "height", "bytes", "created_at"]
        read_only_fields = ["id", "customer", "mime", "width", "height", "bytes", "created_at"]


class CustomerMemosSerializer(serializers.ModelSerializer):
    customer = serializers.StringRelatedField()
    class Meta:
        model = CustomerMemo
        fields = ["id", "customer", "body", "created_at", "updated_at",]
        read_only_fields = ["id", "created_at", "updated_at"]

class CustomerSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "phone",
            "mobile_phone",
            "email",
            "address",
        ]