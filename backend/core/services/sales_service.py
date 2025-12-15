from django.utils.timezone import now
from core.models import Order
from core.models.sales import Sales


def try_auto_create_sales(order: Order):
    # すでに売上計上済なら何もしない
    if hasattr(order, "sales"):
        return

    # 納品チェック
    deliveries = order.deliveries.all()
    total_order_qty = sum(o.quantity for o in order.items.all())
    total_delivered_qty = 0

    for d in deliveries:
        for di in d.items.all():
            total_delivered_qty += di.quantity

    delivery_completed = (total_order_qty == total_delivered_qty)

    # 入金チェック
    pm = getattr(order, "payment_management", None)
    if pm:
        paid_amount = sum(r.amount for r in pm.records.all())
    else:
        paid_amount = 0

    payment_completed = (paid_amount >= order.grand_total)

    # 両方完了していれば売上計上
    if delivery_completed and payment_completed:
        Sales.objects.create(
            order=order,
            sales_date=now().date(),
            sales_amount=order.grand_total,
            sales_type="auto",
        )
