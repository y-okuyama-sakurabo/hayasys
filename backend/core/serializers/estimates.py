from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model

from core.models.estimates import Estimate
from core.models.base import Shop
from core.models import (
    EstimateParty,
    EstimateItem,
    EstimateVehicle,
    Payment,
    CustomerVehicle,
)
from core.models.masters import Gender, CustomerClass, Region

from core.serializers.estimate_items import EstimateItemSerializer
from core.serializers.estimate_vehicles import EstimateVehicleSerializer
from core.serializers.payment import PaymentSerializer
from core.serializers.masters import ShopSerializer

User = get_user_model()


class CreatedBySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "display_name", "login_id", "role"]


class EstimatePartySerializer(serializers.ModelSerializer):
    customer_class = serializers.PrimaryKeyRelatedField(
        queryset=CustomerClass.objects.all(),
        required=False,
        allow_null=True,
    )
    region = serializers.PrimaryKeyRelatedField(
        queryset=Region.objects.all(),
        required=False,
        allow_null=True,
    )
    gender = serializers.PrimaryKeyRelatedField(
        queryset=Gender.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = EstimateParty
        fields = "__all__"


class EstimateSerializer(serializers.ModelSerializer):
    party = EstimatePartySerializer(read_only=True)

    party_id = serializers.PrimaryKeyRelatedField(
        queryset=EstimateParty.objects.all(),
        source="party",
        write_only=True,
        required=False,
        allow_null=True,
    )

    new_party = EstimatePartySerializer(
        write_only=True,
        required=False,
        allow_null=True,
    )

    items = EstimateItemSerializer(many=True, required=False)

    # 表示専用
    vehicles = EstimateVehicleSerializer(
        source="estimate_vehicles",
        many=True,
        read_only=True,
    )

    # 書き込み専用
    vehicles_payload = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
    )

    payments = PaymentSerializer(many=True, required=False)

    created_by = CreatedBySerializer(read_only=True)

    created_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="created_by",
        write_only=True,
        required=False,
    )

    shop = serializers.PrimaryKeyRelatedField(
        queryset=Shop.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Estimate
        fields = "__all__"
        read_only_fields = ["created_at"]

    # =========================================
    # payments
    # =========================================
    def _create_payments(self, estimate, payments_data):
        estimate_ct = ContentType.objects.get_for_model(Estimate)

        for p in payments_data:
            Payment.objects.create(
                content_type=estimate_ct,
                object_id=estimate.id,
                **p,
            )

    # =========================================
    # vehicle UPSERT
    # =========================================
    def _upsert_vehicle(self, estimate, vehicles_data):

        if not vehicles_data:
            estimate.estimate_vehicles.all().delete()
            return

        data = vehicles_data[0]

        source_cv = data.get("source_customer_vehicle")
        if isinstance(source_cv, CustomerVehicle):
            source_cv_id = source_cv.id
        else:
            source_cv_id = source_cv

        vehicle = estimate.estimate_vehicles.filter(is_trade_in=False).first()

        if vehicle:
            # UPDATE
            for key, value in {
                "category_id": data.get("category_id"),
                "vehicle_name": data.get("vehicle_name", ""),
                "manufacturer_id": data.get("manufacturer"),
                "model_year": data.get("model_year", ""),
                "model_code": data.get("model_code", ""),
                "chassis_no": data.get("chassis_no", ""),
                "color_id": data.get("color"),
                "color_name": data.get("color_name", ""),
                "color_code": data.get("color_code", ""),
                "displacement": data.get("displacement"),
                "engine_type": data.get("engine_type", ""),
                "new_car_type": data.get("new_car_type", ""),
            }.items():
                setattr(vehicle, key, value)

            vehicle.source_customer_vehicle_id = source_cv_id
            vehicle.save()

        else:
            # CREATE
            EstimateVehicle.objects.create(
                estimate=estimate,
                is_trade_in=False,
                source_customer_vehicle_id=source_cv_id,
                category_id=data.get("category_id"),
                vehicle_name=data.get("vehicle_name", ""),
                manufacturer_id=data.get("manufacturer"),
                model_year=data.get("model_year", ""),
                model_code=data.get("model_code", ""),
                chassis_no=data.get("chassis_no", ""),
                color_id=data.get("color"),
                color_name=data.get("color_name", ""),
                color_code=data.get("color_code", ""),
                displacement=data.get("displacement"),
                engine_type=data.get("engine_type", ""),
                new_car_type=data.get("new_car_type", ""),
            )

    # =========================================
    # CREATE
    # =========================================
    def create(self, validated_data):
        new_party_data = validated_data.pop("new_party", None)
        items_data = validated_data.pop("items", [])
        vehicles_data = validated_data.pop("vehicles_payload", [])
        payments_data = validated_data.pop("payments", [])

        if new_party_data and not validated_data.get("party"):
            validated_data["party"] = EstimateParty.objects.create(
                **new_party_data
            )

        estimate = Estimate.objects.create(**validated_data)

        for item in items_data:
            item.pop("saveAsProduct", None)
            EstimateItem.objects.create(estimate=estimate, **item)

        self._upsert_vehicle(estimate, vehicles_data)
        self._create_payments(estimate, payments_data)

        return estimate

    # =========================================
    # UPDATE
    # =========================================
    def update(self, instance, validated_data):

        items_data = validated_data.pop("items", None)
        vehicles_data = validated_data.pop("vehicles_payload", None)
        payments_data = validated_data.pop("payments", None)

        new_party_data = validated_data.pop("new_party", None)
        party = validated_data.pop("party", None)

        if party:
            instance.party = party

        elif new_party_data:
            if instance.party:
                for attr, value in new_party_data.items():
                    setattr(instance.party, attr, value)
                instance.party.save()
            else:
                instance.party = EstimateParty.objects.create(
                    **new_party_data
                )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                item.pop("saveAsProduct", None)
                EstimateItem.objects.create(
                    estimate=instance,
                    **item,
                )

        if vehicles_data is not None:
            self._upsert_vehicle(instance, vehicles_data)

        if payments_data is not None:
            Payment.objects.filter(
                content_type=ContentType.objects.get_for_model(Estimate),
                object_id=instance.id,
            ).delete()
            self._create_payments(instance, payments_data)

        return instance


class EstimateDetailSerializer(serializers.ModelSerializer):
    party = EstimatePartySerializer(read_only=True)
    items = EstimateItemSerializer(many=True, read_only=True)
    vehicles = EstimateVehicleSerializer(
        many=True,
        read_only=True,
        source="estimate_vehicles",
    )
    payments = serializers.SerializerMethodField()
    shop = ShopSerializer(read_only=True)
    created_by = CreatedBySerializer(read_only=True)

    class Meta:
        model = Estimate
        fields = [
            "id",
            "estimate_no",
            "vehicle_mode",
            "party",
            "shop",
            "items",
            "vehicles",
            "payments",
            "created_by",

            "estimate_date",
            "created_at",
            "updated_at",
        ]

    def get_payments(self, obj):
        qs = Payment.objects.filter(
            content_type=ContentType.objects.get_for_model(Estimate),
            object_id=obj.id,
        ).order_by("id")
        return PaymentSerializer(qs, many=True).data