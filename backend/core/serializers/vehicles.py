from rest_framework import serializers
from core.models import (
    Vehicle,
    VehicleRegistration,
    VehicleInsurance,
    VehicleWarranty,
    VehicleMemo,
    VehicleImage,
    CustomerVehicle,
)


# ---- Write 用 ----
class VehicleRegistrationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleRegistration
        exclude = ("id", "vehicle")


class VehicleInsuranceWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleInsurance
        exclude = ("id", "vehicle")


class VehicleWarrantyWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleWarranty
        exclude = ("id", "vehicle")


class VehicleMemoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleMemo
        exclude = ("id", "vehicle", "created_by")


class VehicleWriteSerializer(serializers.ModelSerializer):
    registrations = VehicleRegistrationWriteSerializer(many=True, required=False)
    insurances    = VehicleInsuranceWriteSerializer(many=True, required=False)
    warranties    = VehicleWarrantyWriteSerializer(many=True, required=False)
    memos         = VehicleMemoWriteSerializer(many=True, required=False)

    class Meta:
        model = Vehicle
        fields = (
            "vehicle_name",
            "displacement",
            "model_year",
            "new_car_type",
            "manufacturer_id",
            "category_id",
            "model_code",
            "color_id",
            "engine_type",
            "chassis_no",
            "color_name",
            "color_code",
            "registrations",
            "insurances",
            "warranties",
            "memos",
        )
        extra_kwargs = {f: {"required": False, "allow_null": True} for f in fields}

    def validate_chassis_no(self, value):
        """空文字ならNoneとして扱う"""
        return value or None

    def create(self, validated_data):
        registrations = validated_data.pop("registrations", [])
        insurances    = validated_data.pop("insurances", [])
        warranties    = validated_data.pop("warranties", [])
        memos         = validated_data.pop("memos", [])

        vehicle = Vehicle.objects.create(**validated_data)

        for reg in registrations:
            VehicleRegistration.objects.create(vehicle=vehicle, **reg)
        for ins in insurances:
            VehicleInsurance.objects.create(vehicle=vehicle, **ins)
        for war in warranties:
            VehicleWarranty.objects.create(vehicle=vehicle, **war)
        for memo in memos:
            VehicleMemo.objects.create(vehicle=vehicle, **memo)

        return vehicle
    
    def update(self, instance, validated_data):
        registrations = validated_data.pop("registrations", None)
        insurances    = validated_data.pop("insurances", None)
        warranties    = validated_data.pop("warranties", None)
        memos         = validated_data.pop("memos", None)

        # --- Vehicle本体 ---
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # --- 子テーブル更新 ---
        if registrations is not None:
            instance.registrations.all().delete()
            for reg in registrations:
                VehicleRegistration.objects.create(vehicle=instance, **reg)

        if insurances is not None:
            instance.insurances.all().delete()
            for ins in insurances:
                VehicleInsurance.objects.create(vehicle=instance, **ins)

        if warranties is not None:
            instance.warranties.all().delete()
            for war in warranties:
                VehicleWarranty.objects.create(vehicle=instance, **war)

        if memos is not None:
            instance.memos.all().delete()
            for memo in memos:
                VehicleMemo.objects.create(vehicle=instance, **memo)

        return instance

# ---- Read 用 ----
class VehicleRegistrationReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleRegistration
        fields = "__all__"


class VehicleInsuranceReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleInsurance
        fields = "__all__"


class VehicleWarrantyReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleWarranty
        fields = "__all__"


class VehicleMemoReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleMemo
        fields = "__all__"


# ---- 歴代所有者 ----
class VehicleOwnerReadSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta:
        model = CustomerVehicle
        fields = ("id", "customer_id", "customer_name", "owned_from", "owned_to")


# ---- 詳細表示 ----
class VehicleDetailSerializer(serializers.ModelSerializer):
    # --- 外部キーを名前付きで展開 ---
    manufacturer_name = serializers.CharField(source="manufacturer.name", read_only=True)
    category_name     = serializers.CharField(source="category.name", read_only=True)
    color_label       = serializers.CharField(source="color.name", read_only=True)  # ←ここ変更

    # --- 関連データ ---
    registrations = VehicleRegistrationReadSerializer(many=True, read_only=True)
    insurances    = VehicleInsuranceReadSerializer(many=True, read_only=True)
    warranties    = VehicleWarrantyReadSerializer(many=True, read_only=True)
    memos         = VehicleMemoReadSerializer(many=True, read_only=True)
    owners        = VehicleOwnerReadSerializer(source="customer_vehicles", many=True, read_only=True)

    class Meta:
        model = Vehicle
        fields = (
            "id",
            "vehicle_name",
            "displacement",
            "model_year",
            "new_car_type",
            "manufacturer_id",
            "manufacturer_name",
            "category_id",
            "category_name",
            "model_code",
            "chassis_no",
            "engine_type",
            "color_id",
            "color_label",   # ←区別したフィールド名
            "color_name",
            "color_code",
            "registrations",
            "insurances",
            "warranties",
            "memos",
            "owners",
            "created_at",
            "updated_at",
        )


# ---- 一覧表示 ----
class VehicleListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = (
            "id",
            "vehicle_name",
            "model_year",
            "chassis_no",
            "color_name",
            "color_code",
        )

class VehicleImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = VehicleImage
        fields = [
            "id",
            "vehicle",        # ← 外部キー修正
            "image",
            "image_url",      # ← URLを追加
            "mime",
            "width",
            "height",
            "bytes",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "vehicle",        # ← customer → vehicle に修正
            "mime",
            "width",
            "height",
            "bytes",
            "created_at",
        ]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and hasattr(obj.image, "url"):
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None

class VehicleMemosSerializer(serializers.ModelSerializer):
    vehicle = serializers.StringRelatedField()  # 関連先Vehicleを文字列表示
    created_by = serializers.StringRelatedField()  # 投稿者名を表示（User.username）

    class Meta:
        model = VehicleMemo
        fields = ["id", "vehicle", "body", "created_by", "created_at", "updated_at"]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]