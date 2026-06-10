from rest_framework import serializers
from core.models import Settlement
from core.models.payment_company import PaymentCompany


class SettlementSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(
        queryset=PaymentCompany.objects.all(),
        required=False,
        allow_null=True,
    )
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = Settlement
        fields = [
            "id",
            "settlement_type",
            "amount",
            "company",
            "company_name",
        ]
        read_only_fields = ["id"]

    def get_company_name(self, obj):
        return obj.company.name if obj.company else None

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("金額は0以上で入力してください")
        return value

    def validate(self, data):
        settlement_type = data.get("settlement_type")
        amount = data.get("amount", 0)

        # ローンなのに0円はNG
        if settlement_type == "loan" and amount == 0:
            raise serializers.ValidationError({
                "amount": "ローンは0円では登録できません"
            })

        return data