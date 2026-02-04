from rest_framework import generics, permissions
from django.db.models import Sum
from django.db import transaction
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
                "category",
            )
        )

    @transaction.atomic
    def perform_create(self, serializer):
        order_id = self.kwargs["order_id"]
        order = Order.objects.get(id=order_id)

        # OrderItem 作成
        item = serializer.save(order=order)

        # ★ UIフラグ取得
        save_flag = serializer.validated_data.get("saveAsProduct", False)

        # ★ Product 作成
        self._create_product_if_needed(item, save_flag)

        # 合計更新
        self.update_order_totals(order_id)

    def _create_product_if_needed(self, item: OrderItem, save_flag: bool):
        if not save_flag:
            return

        # 最低限必要
        if not item.name or not item.category_id:
            return

        Product.objects.get_or_create(
            name=item.name,
            category_id=item.category_id,
            defaults={
                "unit_price": item.unit_price,
                "tax_type": item.tax_type,
                "is_active": True,
            },
        )

    def update_order_totals(self, order_id):
        items = OrderItem.objects.filter(order_id=order_id)
        subtotal = items.aggregate(total=Sum("subtotal"))["total"] or Decimal("0")
        tax_target = items.filter(
            tax_type="taxable"
        ).aggregate(total=Sum("subtotal"))["total"] or Decimal("0")

        tax_rate = Decimal("0.1")
        Order.objects.filter(id=order_id).update(
            subtotal=subtotal,
            tax_total=tax_target * tax_rate,
            grand_total=subtotal + (tax_target * tax_rate),
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
