from rest_framework import serializers
from core.models import Order
from core.models.order_delivery_payment import Delivery, DeliveryItem, PaymentManagement


class DeliveryStatusSerializer(serializers.Serializer):
    delivery_status = serializers.SerializerMethodField()

    def get_delivery_status(self, order: Order):
        deliveries = order.deliveries.all()
        if not deliveries.exists():
            return "未納品"

        # 全 order_item の総数と納品済数量を計算
        order_items = {item.id: item.quantity for item in order.items.all()}
        delivered = {}

        for d in deliveries:
            for di in d.items.all():
                delivered.setdefault(di.order_item_id, 0)
                delivered[di.order_item_id] += float(di.quantity)

        pending = False
        partial = False

        for oi_id, qty in order_items.items():
            delivered_qty = delivered.get(oi_id, 0)
            if delivered_qty == 0:
                pending = True
            elif delivered_qty < qty:
                partial = True

        if pending and not partial:
            return "未納品"
        if partial or (pending and partial):
            return "一部納品"
        return "納品完了"


class PaymentStatusSerializer(serializers.Serializer):
    payment_status = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()

    def get_total_paid(self, order: Order):
        pm = getattr(order, "payment_management", None)
        if not pm:
            return 0
        return sum(rec.amount for rec in pm.records.all())

    def get_balance(self, order: Order):
        return max(order.grand_total - self.get_total_paid(order), 0)

    def get_payment_status(self, order: Order):
        pm = getattr(order, "payment_management", None)
        if not pm:
            return "未入金"

        total_paid = self.get_total_paid(order)

        if total_paid == 0:
            return "未入金"
        elif total_paid < order.grand_total:
            return "一部入金"
        else:
            return "入金完了"


class OrderManagementListSerializer(serializers.ModelSerializer):
    delivery_status = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    shop_id = serializers.IntegerField(source="shop.id", read_only=True)
    shop_name = serializers.CharField(source="shop.name", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_no",
            "order_date",
            "sales_date",
            "party_name",
            "grand_total",

            # 計算系
            "delivery_status",
            "payment_status",
            "total_paid",
            "balance",

            "shop_id",
            "shop_name",
        ]

    def get_delivery_status(self, order):
        return DeliveryStatusSerializer().get_delivery_status(order)

    def get_payment_status(self, order):
        return PaymentStatusSerializer().get_payment_status(order)

    def get_total_paid(self, order):
        return PaymentStatusSerializer().get_total_paid(order)

    def get_balance(self, order):
        return PaymentStatusSerializer().get_balance(order)
