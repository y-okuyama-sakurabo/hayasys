from rest_framework import serializers
from core.models.sales import Sales


class SalesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sales
        fields = [
            "id",
            "order",
            "sales_date",
            "sales_amount",
            "sales_type",
            "memo",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
