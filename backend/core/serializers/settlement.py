from rest_framework import serializers
from core.models import Settlement


class SettlementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settlement
        fields = [
            "id",
            "settlement_type",
            "amount",
        ]
        read_only_fields = ["id"]

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("金額は0以上で入力してください")
        return value

    def validate(self, data):
        settlement_type = data.get("settlement_type")
        amount = data.get("amount", 0)

        # クレジットなのに0円はNG（任意）
        if settlement_type == "credit" and amount == 0:
            raise serializers.ValidationError({
                "amount": "クレジットは0円では登録できません"
            })

        return data