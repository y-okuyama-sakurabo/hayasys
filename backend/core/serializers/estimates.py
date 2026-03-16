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
    CustomerVehicle
)
from core.models.masters import Gender, CustomerClass, Region

from core.serializers.estimate_items import EstimateItemSerializer
from core.serializers.estimate_vehicles import EstimateVehicleSerializer
from core.serializers.payment import PaymentSerializer
from core.serializers.masters import ShopSerializer

User = get_user_model()


# ==========================================================
# 作成者
# ==========================================================
class CreatedBySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "display_name", "login_id", "role"]


# ==========================================================
# Party
# ==========================================================
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


# ==========================================================
# EstimateSerializer
# ==========================================================
class EstimateSerializer(serializers.ModelSerializer):

    # -------------------------
    # Party
    # -------------------------
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

    # -------------------------
    # Items
    # -------------------------
    items = EstimateItemSerializer(many=True, required=False)

    # -------------------------
    # Vehicles
    # -------------------------
    vehicles = EstimateVehicleSerializer(
        many=True,
        write_only=True,
        required=False,
        source="estimate_vehicles",
    )

    # -------------------------
    # Payments
    # -------------------------
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

    # ==========================================================
    # Utility
    # ==========================================================
    def _create_payments(self, estimate, payments_data):
        estimate_ct = ContentType.objects.get_for_model(Estimate)

        for p in payments_data:
            Payment.objects.create(
                content_type=estimate_ct,
                object_id=estimate.id,
                **p,
            )

    def _create_vehicle_and_item(self, estimate, vehicles_data):

        if not vehicles_data:
            return

        vehicle_data = next(
            (v for v in vehicles_data if not v.get("is_trade_in")),
            None,
        )

        if not vehicle_data:
            return

        unit_price = vehicle_data.get("unit_price", 0)
        category_id = vehicle_data.get("category_id")
        source_cv_id = vehicle_data.get("source_customer_vehicle")

        # ==========================================
        # maintenance
        # ==========================================
        if estimate.vehicle_mode == "maintenance":

            source_cv = vehicle_data.get("source_customer_vehicle")

            if isinstance(source_cv, CustomerVehicle):
                source_cv_id = source_cv.id
            else:
                source_cv_id = source_cv

            if source_cv_id:
                cv = CustomerVehicle.objects.select_related(
                    "vehicle", "vehicle__manufacturer"
                ).filter(id=source_cv_id).first()

                if cv and cv.vehicle:
                    v = cv.vehicle

                    EstimateVehicle.objects.create(
                        estimate=estimate,
                        is_trade_in=False,
                        source_customer_vehicle_id=cv.id,
                        category_id=category_id,
                        vehicle_name=v.vehicle_name,
                        manufacturer=v.manufacturer,
                        model_code=v.model_code,
                        chassis_no=v.chassis_no,
                        color=vehicle_data.get("color"), 
                        color_name=getattr(v, "color_name", ""),
                        color_code=getattr(v, "color_code", ""),
                        model_year=getattr(v, "model_year", ""),
                        displacement=getattr(v, "displacement", None),
                        engine_type=getattr(v, "engine_type", ""),
                    )

            EstimateItem.objects.filter(
                estimate=estimate,
                item_type="vehicle",
            ).delete()

            return

        # ==========================================
        # sale
        # ==========================================
        if estimate.vehicle_mode == "sale":

            EstimateItem.objects.filter(
                estimate=estimate,
                item_type="vehicle",
            ).delete()

            vehicle_obj = EstimateVehicle.objects.create(
                estimate=estimate,
                is_trade_in=vehicle_data.get("is_trade_in", False),
                category_id=category_id,
                vehicle_name=vehicle_data.get("vehicle_name", ""),
                manufacturer=vehicle_data.get("manufacturer"),
                model_year=vehicle_data.get("model_year", ""),
                model_code=vehicle_data.get("model_code", ""),
                chassis_no=vehicle_data.get("chassis_no", ""),
                color=vehicle_data.get("color"),    
                color_name=vehicle_data.get("color_name", ""),
                color_code=vehicle_data.get("color_code", ""),
                displacement=vehicle_data.get("displacement"),
                engine_type=vehicle_data.get("engine_type", ""),
                new_car_type=vehicle_data.get("new_car_type", ""),
                source_customer_vehicle_id=vehicle_data.get("source_customer_vehicle"),
            )

            serializer = EstimateItemSerializer(data={
                "item_type": "vehicle",
                "category_id": category_id,
                "name": vehicle_obj.vehicle_name or "",
                "quantity": 1,
                "unit_price": unit_price or 0,
                "discount": 0,
                "tax_type": "taxable",
                "sale_type": vehicle_obj.new_car_type,
            })

            serializer.is_valid(raise_exception=True)
            serializer.save(estimate=estimate)

            return

    # ==========================================================
    # CREATE
    # ==========================================================
    def create(self, validated_data):

        new_party_data = validated_data.pop("new_party", None)
        items_data = validated_data.pop("items", [])
        vehicles_data = validated_data.pop("estimate_vehicles", [])
        payments_data = validated_data.pop("payments", [])

        # Party 作成
        if new_party_data and not validated_data.get("party"):
            validated_data["party"] = EstimateParty.objects.create(
                **new_party_data
            )

        estimate = Estimate.objects.create(**validated_data)

        # Items
        for item in items_data:
            item.pop("saveAsProduct", None)
            EstimateItem.objects.create(estimate=estimate, **item)

        # Vehicles + Vehicle Item
        self._create_vehicle_and_item(estimate, vehicles_data)

        # Payments
        self._create_payments(estimate, payments_data)

        return estimate

    # ==========================================================
    # UPDATE
    # ==========================================================
    def update(self, instance, validated_data):

        items_data = validated_data.pop("items", None)
        vehicles_data = validated_data.pop("estimate_vehicles", None)
        payments_data = validated_data.pop("payments", None)

        validated_data.pop("new_party", None)
        validated_data.pop("party_id", None)

        # ヘッダ更新
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        # Items再構築
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                item.pop("saveAsProduct", None)
                EstimateItem.objects.create(
                    estimate=instance,
                    **item,
                )

        # Vehicles再構築
        if vehicles_data is not None:
            instance.estimate_vehicles.all().delete()
            self._create_vehicle_and_item(instance, vehicles_data)

        # Payments再構築
        if payments_data is not None:
            Payment.objects.filter(
                content_type=ContentType.objects.get_for_model(
                    Estimate
                ),
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
        source="estimate_vehicles"
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
            "created_at",
            "updated_at",
        ]

    def get_payments(self, obj):
        qs = Payment.objects.filter(
            content_type=ContentType.objects.get_for_model(Estimate),
            object_id=obj.id,
        ).order_by("id")
        return PaymentSerializer(qs, many=True).data