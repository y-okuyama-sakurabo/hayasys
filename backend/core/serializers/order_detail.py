from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType

from core.models import Order, Payment, Schedule
from core.serializers.order_items import OrderItemSerializer
from core.serializers.order_vehicles import OrderVehicleSerializer
from core.serializers.payment import PaymentSerializer
from core.serializers.orders import CreatedBySerializer
from core.serializers.masters import ShopSerializer
from core.serializers.customers import CustomerDetailSerializer
from core.serializers.estimates import EstimateSerializer


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    vehicles = OrderVehicleSerializer(
        many=True, read_only=True, source="order_vehicles"
    )
    payments = serializers.SerializerMethodField()
    shop = ShopSerializer(read_only=True)
    created_by = CreatedBySerializer(read_only=True)
    customer = CustomerDetailSerializer(read_only=True)
    estimate = EstimateSerializer(read_only=True)
    schedule = serializers.SerializerMethodField()
    estimate = EstimateSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_no",
            "shop",
            "status",
            "order_date",

            "vehicle_mode",

            "party_name",
            "party_kana",
            "phone",
            "email",
            "postal_code",
            "address",

            "subtotal",
            "discount_total",
            "tax_total",
            "grand_total",

            "customer",
            "items",
            "vehicles",
            "payments",

            "schedule",

            "estimate",

            "created_by",
            "created_at",
            "updated_at",
        ]

    def get_payments(self, obj):
        order_ct = ContentType.objects.get_for_model(Order)

        qs = Payment.objects.filter(
            content_type=order_ct,
            object_id=obj.id,
        ).order_by("id")

        return PaymentSerializer(qs, many=True).data
    
    def get_schedule(self, obj):
        s = Schedule.objects.filter(order=obj).order_by("-start_at").first()

        if not s:
            return None

        return {
            "start_at": s.start_at,
            "end_at": s.end_at,
            "delivery_method": s.delivery_method,
            "delivery_shop": s.delivery_shop.id if s.delivery_shop else None,
            "delivery_shop_name": s.delivery_shop.name if s.delivery_shop else None,
            "description": s.description,
        }