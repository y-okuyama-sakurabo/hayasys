# core/serializers/order_settlements.py

from rest_framework import serializers
from core.models.order_settlement import OrderSettlement


class OrderSettlementSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderSettlement
        fields = [
            "id",
            "settlement_type",
            "amount",
        ]