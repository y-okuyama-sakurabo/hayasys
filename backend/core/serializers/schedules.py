# core/serializers/schedules.py
from rest_framework import serializers
from core.models import Schedule

class ScheduleSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    staff_name = serializers.CharField(source="staff.username", read_only=True)

    class Meta:
        model = Schedule
        fields = [
            "id",
            "title",
            "description",
            "start_at",
            "end_at",
            "customer",
            "customer_name",
            "shop",
            "shop_name",
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
