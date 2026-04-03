# core/serializers/schedules.py
from rest_framework import serializers
from core.models import Schedule, Shop, Estimate, Order

class ScheduleSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    staff_name = serializers.CharField(source="staff.username", read_only=True)
    delivery_shop = serializers.PrimaryKeyRelatedField(
        queryset=Shop.objects.all(),
        required=False,
        allow_null=True,
    )
    estimate = serializers.PrimaryKeyRelatedField(
        queryset=Estimate.objects.all(),
        required=False,
        allow_null=True,
    )

    order = serializers.PrimaryKeyRelatedField(
        queryset=Order.objects.all(),
        required=False,
        allow_null=True,
    )
    delivery_shop_name = serializers.CharField(
        source="delivery_shop.name",
        read_only=True
    )

    class Meta:
        model = Schedule
        fields = [
            "id",
            "title",
            "description",
            "start_at",
            "end_at",
            "estimate",
            "order",
            "delivery_method",
            "customer",
            "customer_name",
            "shop",
            "shop_name",
            "delivery_shop",
            "delivery_shop_name",
            "staff",
            "staff_name",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "staff": {"read_only": True},
            "shop": {"required": False, "allow_null": True},
            "customer": {"required": False, "allow_null": True},
        }
