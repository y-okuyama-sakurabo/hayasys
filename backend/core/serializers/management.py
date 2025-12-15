from rest_framework import serializers
from core.models import Order
from core.models.order_delivery_payment import Delivery, PaymentManagement, PaymentRecord


class ManagementListSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    order_no = serializers.CharField()
    order_date = serializers.DateField()
    sales_date = serializers.DateField(allow_null=True)

    customer_name = serializers.CharField()

    delivery_status = serializers.CharField()
    payment_status = serializers.CharField()

    grand_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    unpaid_total = serializers.DecimalField(max_digits=12, decimal_places=2)
