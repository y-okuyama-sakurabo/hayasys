# core/serializers/payment_company.py
from rest_framework import serializers
from core.models.payment_company import PaymentCompany


class PaymentCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentCompany
        fields = ["id", "name", "payment_type", "sort_order", "is_active"]
