from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum

from core.models import DeliveryItem


class DeliveryItemCancelAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        delivery_item_id = request.data.get("delivery_item_id")

        if not delivery_item_id:
            return Response({"detail": "delivery_item_id は必須です"}, status=400)

        try:
            di = DeliveryItem.objects.select_related("delivery", "order_item").get(id=delivery_item_id)
        except DeliveryItem.DoesNotExist:
            return Response({"detail": "該当の納品明細が存在しません"}, status=404)

        oi = di.order_item
        delivery = di.delivery
        order = delivery.order

        # ---------------------------------------------
        # 🔥 DeliveryItem を削除する
        # ---------------------------------------------
        di.delete()

        # ---------------------------------------------
        # 🔥 この OrderItem の残りの納品数を再集計
        # ---------------------------------------------
        delivered_qty = (
            DeliveryItem.objects.filter(order_item=oi)
            .aggregate(total=Sum("quantity"))["total"] or 0
        )

        if delivered_qty == 0:
            # 納品ゼロなら pending に戻す
            oi.delivery_status = "pending"
            oi.delivery_date = None
        else:
            # 残っていれば delivered のまま
            oi.delivery_status = "delivered"
            # 最新の納品日の取得（必要なら）
            latest_delivery = (
                DeliveryItem.objects.filter(order_item=oi)
                .select_related("delivery")
                .order_by("-delivery__delivery_date")
                .first()
            )
            oi.delivery_date = latest_delivery.delivery.delivery_date

        oi.save(update_fields=["delivery_status", "delivery_date"])

        # ---------------------------------------------
        # 🔥 Delivery にアイテムが無くなったら削除
        # ---------------------------------------------
        if delivery.items.count() == 0:
            delivery.delete()

        # ---------------------------------------------
        # 🔥 Order 全体の納品ステータス再計算
        # ---------------------------------------------
        for d in order.deliveries.all():
            d.update_status()

        return Response({"detail": "納品を取消しました"}, status=200)
