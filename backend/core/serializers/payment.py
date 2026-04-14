# core/serializers/payment.py
from rest_framework import serializers
from core.models.payments import Payment


class PaymentSerializer(serializers.ModelSerializer):
    """クレジット情報専用"""

    class Meta:
        model = Payment
        fields = [
            "id",
            "credit_company",
            "credit_first_payment",
            "credit_second_payment",
            "credit_bonus_payment",
            "credit_installments",
            "credit_start_month",
        ]
        read_only_fields = ["id"]

    def validate(self, data):
        """クレジット情報の必須チェック"""

        if not data.get("credit_company"):
            raise serializers.ValidationError({
                "credit_company": "信販会社は必須です"
            })

        if not data.get("credit_installments"):
            raise serializers.ValidationError({
                "credit_installments": "分割回数は必須です"
            })

        return data

