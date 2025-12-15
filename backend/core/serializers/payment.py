# core/serializers/payment.py
from rest_framework import serializers
from core.models.payments import Payment


class PaymentSerializer(serializers.ModelSerializer):
    """支払い情報のシリアライザ"""

    class Meta:
        model = Payment
        fields = [
            "id",
            "payment_method",
            "credit_company",
            "credit_first_payment",
            "credit_second_payment",
            "credit_bonus_payment",
            "credit_installments",
            "credit_start_month",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, data):
        """クレジット支払い時だけ分割関連フィールドを検証"""
        method = data.get("payment_method")

        if method in ["credit", "クレジット"]:
            installments = data.get("credit_installments")
            if installments is None:
                raise serializers.ValidationError({
                    "credit_installments": "クレジット支払い時は分割回数が必須です。"
                })
        else:
            credit_fields = [
                "credit_company",
                "credit_first_payment",
                "credit_second_payment",
                "credit_bonus_payment",
                "credit_installments",
                "credit_start_month",
            ]
            for field in credit_fields:
                data[field] = None

        return data

