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
from core.models import Manufacturer, VehicleCategory, Color
from core.utils.images import compress_image
from PIL import Image



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
    manufacturer_id = serializers.PrimaryKeyRelatedField(
        queryset=Manufacturer.objects.all(),
        source="manufacturer",
        required=False,
        allow_null=True
    )

    category_id = serializers.PrimaryKeyRelatedField(
        queryset=VehicleCategory.objects.all(),
        source="category",
        required=False,
        allow_null=True
    )

    color_id = serializers.PrimaryKeyRelatedField(
        queryset=Color.objects.all(),
        source="color",
        required=False,
        allow_null=True
    )
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
            "color_label",
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
    manufacturer_name = serializers.CharField(
        source="manufacturer.name",
        read_only=True
    )
    class Meta:
        model = Vehicle
        fields = (
            "id",
            "vehicle_name",
            "manufacturer_name",
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
            "vehicle",
            "image",
            "image_url",
            "mime",
            "width",
            "height",
            "bytes",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "vehicle",
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

    # 🔥 容量制限
    def validate_image(self, image):
        max_size = 5 * 1024 * 1024  # 5MB
        if image.size > max_size:
            raise serializers.ValidationError("画像は5MB以下にしてください")
        return image

    # 🔥 圧縮＋メタ保存
    def create(self, validated_data):
        image = validated_data.get("image")

        if image:
            compressed = compress_image(image)
            validated_data["image"] = compressed

            img = Image.open(compressed)

            validated_data["width"] = img.width
            validated_data["height"] = img.height
            validated_data["bytes"] = compressed.size

            ext = compressed.name.lower().split(".")[-1]
            if ext in ["jpg", "jpeg"]:
                validated_data["mime"] = "image/jpeg"
            elif ext == "png":
                validated_data["mime"] = "image/png"
            else:
                validated_data["mime"] = "image/jpeg"

        return super().create(validated_data)

class VehicleMemosSerializer(serializers.ModelSerializer):
    vehicle = serializers.StringRelatedField()  
    created_by = serializers.StringRelatedField()

    class Meta:
        model = VehicleMemo
        fields = ["id", "vehicle", "body", "created_by", "created_at", "updated_at"]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

class VehicleInsuranceSerializer(serializers.ModelSerializer):

    class Meta:
        model = VehicleInsurance
        fields = "__all__"
        read_only_fields = [
            "id",
            "vehicle",
            "created_at",
            "updated_at",
        ]

class VehicleWarrantySerializer(serializers.ModelSerializer):

    class Meta:
        model = VehicleWarranty
        fields = "__all__"
        read_only_fields = [
            "id",
            "vehicle",
            "created_at",
            "updated_at",
        ]