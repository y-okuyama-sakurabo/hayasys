from rest_framework import serializers
from core.models import Order


class OrderSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            "id",
            "order_no",
            "order_date",
            "sales_date",
            "customer",
            "grand_total",
            "status",
        ]
