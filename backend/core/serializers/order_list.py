class OrderListSerializer(serializers.ModelSerializer):
    delivery_status = serializers.SerializerMethodField()
    paid_amount = serializers.SerializerMethodField()
    unpaid_amount = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_no",
            "order_date",
            "sales_date",
            "party_name",
            "grand_total",

            "delivery_status",
            "paid_amount",
            "unpaid_amount",
        ]

    def get_delivery_status(self, obj):
        if hasattr(obj, "delivery"):
            return obj.delivery.delivery_status
        return "pending"  # 未納品扱い

    def get_paid_amount(self, obj):
        pm = getattr(obj, "payment_management", None)
        if not pm:
            return 0
        
        return pm.records.aggregate(total=models.Sum("amount"))["total"] or 0

    def get_unpaid_amount(self, obj):
        total = obj.grand_total or 0
        paid = self.get_paid_amount(obj)
        return total - paid

