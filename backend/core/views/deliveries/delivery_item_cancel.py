from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.db.models import Sum

from core.models import DeliveryItem, Order


class DeliveryItemCancelAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        delivery_item_id = request.data.get("delivery_item_id")

        if not delivery_item_id:
            return Response({"detail": "delivery_item_id は必須です"}, status=400)

        try:
            di = DeliveryItem.objects.select_related("delivery__order", "order_item").get(
                id=delivery_item_id
            )
        except DeliveryItem.DoesNotExist:
            return Response({"detail": "該当の納品明細が存在しません"}, status=404)

        order_id = di.delivery.order_id

        with transaction.atomic():
            oi       = di.order_item
            delivery = di.delivery

            # ── DeliveryItem 削除 ──────────────────────────────────
            di.delete()

            # ── OrderItem の納品ステータス再計算 ──────────────────
            delivered_qty = (
                DeliveryItem.objects.filter(order_item=oi)
                .aggregate(total=Sum("quantity"))["total"] or 0
            )

            if delivered_qty == 0:
                oi.delivery_status = "pending"
                oi.delivery_date   = None
            else:
                oi.delivery_status = "delivered"
                latest = (
                    DeliveryItem.objects.filter(order_item=oi)
                    .select_related("delivery")
                    .order_by("-delivery__delivery_date")
                    .first()
                )
                oi.delivery_date = latest.delivery.delivery_date if latest else None

            oi.save(update_fields=["delivery_status", "delivery_date"])

            # ── Order 全体の納品ステータス再計算 ──────────────────
            # ※ delivery.delete() より先に呼ぶ
            new_delivery_status = delivery.update_status()

            # ── Delivery が空なら削除 ─────────────────────────────
            if not delivery.items.exists():
                delivery.delete()

            # ── 売上取消判定（DB から最新の Order を取得して判断）─
            order = Order.objects.get(pk=order_id)
            sales_cancelled = False

            if new_delivery_status != "delivered" and order.status == "sales_completed":
                order.sales_date = None
                order.status     = "ordered"
                order.save(update_fields=["sales_date", "status"])
                sales_cancelled = True

        detail = "納品を取消しました"
        if sales_cancelled:
            detail = "納品を取消しました。売上計上も取消されました。"

        return Response({"detail": detail, "sales_cancelled": sales_cancelled}, status=200)
