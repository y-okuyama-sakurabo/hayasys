from rest_framework import generics, permissions
from django.db.models import Sum
from decimal import Decimal

from core.models import Order, OrderItem
from core.serializers.orders import OrderItemSerializer


class OrderItemListCreateAPIView(generics.ListCreateAPIView):
    """
    指定した受注の明細一覧取得・追加
    """
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        order_id = self.kwargs["order_id"]
        return (
            OrderItem.objects
            .filter(order_id=order_id)
            .select_related(
                "product",
                "product__small",
                "product__small__middle",
                "product__small__middle__large",
            )
        )

    def perform_create(self, serializer):
        order_id = self.kwargs["order_id"]
        order = Order.objects.get(id=order_id)
        serializer.save(order=order)
        self.update_order_totals(order_id)

    def update_order_totals(self, order_id):
        """
        明細から受注合計を再計算
        """
        items = OrderItem.objects.filter(order_id=order_id)
        subtotal = items.aggregate(total=Sum("subtotal"))["total"] or Decimal("0")
        tax_target = items.filter(tax_type="taxable").aggregate(total=Sum("subtotal"))["total"] or Decimal("0")
        grand_total = subtotal

        tax_rate = Decimal("0.1")  # TODO: 将来マスタ化など
        from core.models import Order
        Order.objects.filter(id=order_id).update(
            subtotal=subtotal,
            tax_total=tax_target * tax_rate,
            grand_total=grand_total + (tax_target * tax_rate),
        )


class OrderItemRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    明細の取得・更新・削除
    """
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return OrderItem.objects.select_related(
            "product",
            "product__small",
            "product__small__middle",
            "product__small__middle__large",
        )

    def perform_update(self, serializer):
        item = serializer.save()
        self.update_order_totals(item.order_id)

    def perform_destroy(self, instance):
        order_id = instance.order_id
        instance.delete()
        self.update_order_totals(order_id)

    def update_order_totals(self, order_id):
        items = OrderItem.objects.filter(order_id=order_id)
        subtotal = items.aggregate(total=Sum("subtotal"))["total"] or Decimal("0")
        tax_target = items.filter(tax_type="taxable").aggregate(total=Sum("subtotal"))["total"] or Decimal("0")
        grand_total = subtotal

        tax_rate = Decimal("0.1")
        from core.models import Order
        Order.objects.filter(id=order_id).update(
            subtotal=subtotal,
            tax_total=tax_target * tax_rate,
            grand_total=grand_total + (tax_target * tax_rate),
        )
