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
        errors = []

        if not data.get("credit_company"):
            errors.append("信販会社を選択してください")

        if not data.get("credit_installments"):
            errors.append("分割回数を入力してください")

        if errors:
            raise serializers.ValidationError({"non_field_errors": errors})

        return data

