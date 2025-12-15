from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model
from core.models.estimates import Estimate
from core.models.base import Shop
from core.models import EstimateParty, EstimateItem
from core.models.payments import Payment
from core.models.masters import Gender, CustomerClass, Region
from core.serializers.estimate_items import EstimateItemSerializer
from core.serializers.estimate_vehicles import EstimateVehicleSerializer
from core.serializers.payment import PaymentSerializer
from core.serializers.masters import ShopSerializer

User = get_user_model()

class CreatedBySerializer(serializers.ModelSerializer):
    """見積作成者情報"""
    class Meta:
        model = User
        fields = ["id", "display_name", "login_id", "role"]

# === 顧客スナップショット ===
class EstimatePartySerializer(serializers.ModelSerializer):
    customer_class = serializers.PrimaryKeyRelatedField(
        queryset=CustomerClass.objects.all(),
        required=False,
        allow_null=True
    )
    region = serializers.PrimaryKeyRelatedField(
        queryset=Region.objects.all(),
        required=False,
        allow_null=True
    )
    gender = serializers.PrimaryKeyRelatedField(
        queryset=Gender.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = EstimateParty
        fields = "__all__"


# === 見積ヘッダ + 明細 ===
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
    created_by = CreatedBySerializer(read_only=True)
    shop = serializers.PrimaryKeyRelatedField(
        queryset=Shop.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Estimate
        fields = [
            "id",
            "estimate_no",
            "shop",
            "status",
            "estimate_date",
            "party",
            "party_id",
            "new_party",
            "subtotal",
            "discount_total",
            "tax_total",
            "grand_total",
            "items",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]

    # === 新規作成 ===
    def create(self, validated_data):
        new_party_data = validated_data.pop("new_party", None)

        if new_party_data and not validated_data.get("party"):
            fk_fields = ["customer_class", "region", "gender"]
            fk_id_updates = {}

            for fk in fk_fields:
                if fk in new_party_data:
                    value = new_party_data[fk]

                    if hasattr(value, "id"):
                        fk_id_updates[f"{fk}_id"] = value.id
                    elif isinstance(value, int) or (isinstance(value, str) and value.isdigit()):
                        fk_id_updates[f"{fk}_id"] = int(value)
                    elif value in [None, ""]:
                        fk_id_updates[f"{fk}_id"] = None
                    else:
                        fk_id_updates[f"{fk}_id"] = None

                    new_party_data.pop(fk, None)

            new_party_data.update(fk_id_updates)
            new_party = EstimateParty.objects.create(**new_party_data)
            validated_data["party"] = new_party

        # 🔹 見積ヘッダ作成
        instance = super().create(validated_data)
        print("🟢 CREATED ESTIMATE:", instance.id)
        if instance.party_id:
            instance.party.refresh_from_db()

        return instance

    # === 更新 ===
    def update(self, instance, validated_data):
        print("=== DEBUG: Request Data (validated_data) ===")
        print(validated_data)

        new_party_data = validated_data.pop("new_party", None)
        print("=== DEBUG: new_party_data ===")
        print(new_party_data)

        if new_party_data:
            if not new_party_data.get("birthdate"):
                new_party_data["birthdate"] = None

            fk_fields = ["customer_class", "region", "gender"]

            # --- 外部キーID変換 ---
            fk_id_updates = {}
            for fk in fk_fields:
                if fk in new_party_data:
                    value = new_party_data[fk]

                    # モデルインスタンス（<CustomerClass: 個人>など）の場合
                    if hasattr(value, "id"):
                        fk_id_updates[f"{fk}_id"] = value.id

                    # ID（intまたは数字文字列）の場合
                    elif isinstance(value, int) or (isinstance(value, str) and value.isdigit()):
                        fk_id_updates[f"{fk}_id"] = int(value)

                    # Noneや空文字ならNULL扱い
                    elif value in [None, ""]:
                        fk_id_updates[f"{fk}_id"] = None

                    # それ以外の型はスキップ
                    else:
                        fk_id_updates[f"{fk}_id"] = None

                    new_party_data.pop(fk, None)

            # --- 更新 or 新規作成 ---
            if instance.party:
                party = instance.party

                # 外部キーIDセット
                for fk_id_field, value in fk_id_updates.items():
                    setattr(party, fk_id_field, value)

                # 通常フィールド更新
                for field, value in new_party_data.items():
                    setattr(party, field, value)

                party.save(update_fields=None)

            else:
                new_party_data.update(fk_id_updates)
                new_party = EstimateParty.objects.create(**new_party_data)
                instance.party = new_party

        # === 見積ヘッダ更新 ===
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if instance.party_id:
            instance.party.refresh_from_db()

        return instance
    
    def get_created_by(self, obj):    
        if not obj.created_by:
            return None
        return {
            "id": obj.created_by.id,
            "login_id": obj.created_by.login_id,
            "username": getattr(obj.created_by, "username", None),
            "role": getattr(obj.created_by, "role", None),
        }

# === 見積詳細 ===
class EstimateDetailSerializer(serializers.ModelSerializer):
    party = EstimatePartySerializer(read_only=True)
    items = EstimateItemSerializer(many=True, read_only=True)
    vehicles = EstimateVehicleSerializer(
        many=True, read_only=True, source="estimate_vehicles"
    )
    payments = serializers.SerializerMethodField()
    shop = ShopSerializer(read_only=True)

    class Meta:
        model = Estimate
        fields = [
            "id",
            "estimate_no",
            "party",
            "shop",
            "items",
            "vehicles",
            "payments",
            "created_at",
            "updated_at",
        ]

    def get_payments(self, obj):
        qs = Payment.objects.filter(
            content_type=ContentType.objects.get_for_model(Estimate),
            object_id=obj.id,
        ).order_by("id")
        return PaymentSerializer(qs, many=True).data
