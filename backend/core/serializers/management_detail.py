from decimal import Decimal

from rest_framework import serializers
from core.models import Order, OrderItem
from core.models.order_delivery_payment import (
    Delivery,
    DeliveryItem,
    PaymentManagement,
    PaymentRecord,
)


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "name",
            "quantity",
            "unit_price",
            "delivery_status",
            "delivery_date",
        ]


class DeliveryItemSerializer(serializers.ModelSerializer):
    order_item = serializers.IntegerField(source="order_item.id", read_only=True)
    order_item_name = serializers.CharField(source="order_item.name", read_only=True)

    class Meta:
        model = DeliveryItem
        fields = ["id", "order_item", "order_item_name", "quantity"]


class PaymentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentRecord
        fields = ["id", "amount", "payment_date", "method", "memo"]


class ManagementDeliverySerializer(serializers.ModelSerializer):
    items = DeliveryItemSerializer(many=True)

    class Meta:
        model = Delivery
        fields = ["id", "delivery_date", "delivery_status", "items"]


class ManagementDetailSerializer(serializers.ModelSerializer):
    # 画面表示用（View側でannotate/付与してる想定でもOK）
    delivery_status = serializers.CharField()
    final_delivery_date = serializers.DateField(allow_null=True)

    # ✅ 追加：入金ステータス
    payment_status = serializers.SerializerMethodField()

    # 合計系
    paid_total = serializers.SerializerMethodField()
    unpaid_total = serializers.SerializerMethodField()

    # ✅ 既存：売上日
    sales_date = serializers.SerializerMethodField()

    # ✅ 入金完了日（入金済のときだけ返す）
    final_payment_date = serializers.SerializerMethodField()

    # ネスト
    items = OrderItemSerializer(many=True)
    deliveries = ManagementDeliverySerializer(many=True)

    # PaymentManagement が無いときでも落ちないように
    payments = PaymentRecordSerializer(
        source="payment_management.records",
        many=True,
        required=False,
    )

    customer_name = serializers.CharField(source="party_name")

    class Meta:
        model = Order
        fields = [
            "id",
            "order_no",
            "order_date",
            "sales_date",
            "customer_name",
            "items",
            "deliveries",
            "payments",
            "grand_total",
            "paid_total",
            "unpaid_total",
            "payment_status",        # ✅ 追加
            "delivery_status",
            "final_delivery_date",
            "final_payment_date",    # ✅ method化
        ]

    # ----------------------------
    # 売上日
    # ----------------------------
    def get_sales_date(self, obj):
        return getattr(obj, "sales_date", None)

    # ----------------------------
    # 入金済合計
    # ----------------------------
    def get_paid_total(self, obj):
        pm = getattr(obj, "payment_management", None)
        if pm is None:
            return Decimal("0")

        # amount が Decimal を想定。None対策も入れる
        total = Decimal("0")
        for p in pm.records.all():
            total += (p.amount or Decimal("0"))
        return total

    # ----------------------------
    # 残額
    # ----------------------------
    def get_unpaid_total(self, obj):
        grand = obj.grand_total or Decimal("0")
        paid = self.get_paid_total(obj)
        unpaid = grand - paid
        return unpaid if unpaid > 0 else Decimal("0")

    # ----------------------------
    # 入金ステータス
    # unpaid / partial / paid を返す（フロントの判定に合わせる）
    # ----------------------------
    def get_payment_status(self, obj):
        grand = obj.grand_total or Decimal("0")
        paid = self.get_paid_total(obj)

        # grand_total が 0 の受注は "paid" 扱いにしておく（運用ルールに合わせて変更OK）
        if grand <= 0:
            return "paid"

        if paid <= 0:
            return "unpaid"
        if paid < grand:
            return "partial"
        return "paid"

    # ----------------------------
    # 入金完了日：入金済のとき最後の入金日を返す
    # ----------------------------
    def get_final_payment_date(self, obj):
        if self.get_payment_status(obj) != "paid":
            return None

        pm = getattr(obj, "payment_management", None)
        if pm is None:
            return None

        last = pm.records.order_by("-payment_date", "-id").first()
        return last.payment_date if last else None
