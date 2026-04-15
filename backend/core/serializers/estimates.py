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
    Schedule,
    Settlement,
    Insurance,
)
from core.models.masters import Gender, CustomerClass, Region
from core.models import EstimateVehicleRegistration

from core.serializers.estimate_items import EstimateItemSerializer
from core.serializers.estimate_vehicles import EstimateVehicleSerializer
from core.serializers.payment import PaymentSerializer
from core.serializers.masters import ShopSerializer
from core.serializers.settlement import SettlementSerializer
from core.serializers.insurance import InsuranceSerializer

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
    settlements = SettlementSerializer(many=True, required=False)
    payment = PaymentSerializer(required=False, allow_null=True)

    # 読み取り
    insurance = InsuranceSerializer(read_only=True)

    # 書き込み用
    insurance_payload = serializers.DictField(write_only=True, required=False)

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
    # settlements
    # =========================================
    def _create_settlements(self, estimate, settlements_data):
        ct = ContentType.objects.get_for_model(Estimate)

        for s in settlements_data:
            Settlement.objects.create(
                content_type=ct,
                object_id=estimate.id,
                settlement_type=s["settlement_type"],
                amount=s["amount"],
            )

    # =========================================
    # payments
    # =========================================
    def _upsert_payment(self, estimate, payment_data, settlements_data):
        ct = ContentType.objects.get_for_model(Estimate)

        credit_amount = sum(
            int(s["amount"])
            for s in settlements_data
            if s["settlement_type"] == "credit"
        )

        if credit_amount > 0:
            Payment.objects.update_or_create(
                content_type=ct,
                object_id=estimate.id,
                defaults=payment_data or {},
            )
        else:
            Payment.objects.filter(
                content_type=ct,
                object_id=estimate.id,
            ).delete()

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

            registrations = data.get("registrations", [])

            if registrations is not None:
                vehicle.registrations.all().delete()

                for reg in registrations:
                    EstimateVehicleRegistration.objects.create(
                        vehicle=vehicle,
                        registration_area=reg.get("registration_area"),
                        registration_no=reg.get("registration_no"),
                        certification_no=reg.get("certification_no"),
                        inspection_expiration=reg.get("inspection_expiration"),
                        first_registration_date=reg.get("first_registration_date"),
                    )

        else:
            # CREATE
            vehicle = EstimateVehicle.objects.create(
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

            registrations = data.get("registrations", [])

            for reg in registrations:
                EstimateVehicleRegistration.objects.create(
                    vehicle=vehicle,
                    registration_area=reg.get("registration_area"),
                    registration_no=reg.get("registration_no"),
                    certification_no=reg.get("certification_no"),
                    inspection_expiration=reg.get("inspection_expiration"),
                    first_registration_date=reg.get("first_registration_date"),
                )

    # =========================================
    # CREATE
    # =========================================
    def create(self, validated_data):
        new_party_data = validated_data.pop("new_party", None)
        items_data = validated_data.pop("items", [])
        vehicles_data = validated_data.pop("vehicles_payload", [])
        settlements_data = validated_data.pop("settlements", [])
        payment_data = validated_data.pop("payment", None)
        schedule_data = validated_data.pop("schedule", None)
        insurance_data = validated_data.pop("insurance_payload", None)

        if new_party_data and not validated_data.get("party"):
            validated_data["party"] = EstimateParty.objects.create(
                **new_party_data
            )



        estimate = Estimate.objects.create(**validated_data)

        if insurance_data is not None:
            Insurance.objects.filter(estimate=estimate).delete()

            Insurance.objects.create(
                estimate=estimate,
                **insurance_data
            )

        for item in items_data:
            item.pop("saveAsProduct", None)
            EstimateItem.objects.create(estimate=estimate, **item)

        self._upsert_vehicle(estimate, vehicles_data)
        self._create_settlements(estimate, settlements_data)
        self._upsert_payment(estimate, payment_data, settlements_data)

        return estimate

    # =========================================
    # UPDATE
    # =========================================
    def update(self, instance, validated_data):

        items_data = validated_data.pop("items", None)
        vehicles_data = validated_data.pop("vehicles_payload", None)
        settlements_data = validated_data.pop("settlements", None)
        payment_data = validated_data.pop("payment", None)

        new_party_data = validated_data.pop("new_party", None)
        party = validated_data.pop("party", None)
        schedule_data = validated_data.pop("schedule", None)
        insurance_data = validated_data.pop("insurance_payload", None)

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

        if settlements_data is not None:
            ct = ContentType.objects.get_for_model(Estimate)

            Settlement.objects.filter(
                content_type=ct,
                object_id=instance.id,
            ).delete()

            self._create_settlements(instance, settlements_data)

        if payment_data is not None or settlements_data is not None:
            self._upsert_payment(
                instance,
                payment_data,
                settlements_data or []
            )

        if insurance_data is not None:
            Insurance.objects.filter(estimate=instance).delete()

            Insurance.objects.create(
                estimate=instance,
                **insurance_data
            )

        return instance
    
    def validate(self, data):
        settlements = self.initial_data.get("settlements", [])

        # 合計チェック
        total = sum(int(s.get("amount", 0)) for s in settlements)
        grand_total = self.initial_data.get("grand_total")

        if grand_total is not None:
            grand_total = int(grand_total)

            if settlements and total != grand_total:
                raise serializers.ValidationError({
                    "settlements": "支払い合計が総額と一致しません"
                })

        # クレジットチェック
        credit_amount = sum(
            int(s.get("amount", 0))
            for s in settlements
            if s.get("settlement_type") == "credit"
        )

        payment_data = self.initial_data.get("payment")

        if credit_amount > 0 and not payment_data:
            raise serializers.ValidationError({
                "payment": "クレジット情報を入力してください"
            })
        
        credit_count = sum(
            1 for s in settlements
            if s.get("settlement_type") == "credit"
        )

        if credit_count > 1:
            raise serializers.ValidationError({
                "settlements": "クレジットは1件のみです"
            })

        return data

class EstimateDetailSerializer(serializers.ModelSerializer):
    party = EstimatePartySerializer(read_only=True)
    items = EstimateItemSerializer(many=True, read_only=True)
    schedule = serializers.SerializerMethodField()
    vehicles = EstimateVehicleSerializer(
        many=True,
        read_only=True,
        source="estimate_vehicles",
    )
    payments = serializers.SerializerMethodField()
    settlements = serializers.SerializerMethodField()
    insurance = InsuranceSerializer(read_only=True)
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
            "insurance",
            "settlements",
            "created_by",
            "schedule",
            "memo", 
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
    
    def get_settlements(self, obj):
        ct = ContentType.objects.get_for_model(Estimate)

        qs = Settlement.objects.filter(
            content_type=ct,
            object_id=obj.id,
        )

        return SettlementSerializer(qs, many=True).data
    
    def get_schedule(self, obj):
        s = Schedule.objects.filter(estimate=obj).first()

        if not s:
            return None

        return {
            "start_at": s.start_at,
            "end_at": s.end_at,
            "delivery_method": s.delivery_method,
            "delivery_shop": s.delivery_shop_id,
            "delivery_shop_name": s.delivery_shop.name if s.delivery_shop else None,
            "description": s.description,
        }