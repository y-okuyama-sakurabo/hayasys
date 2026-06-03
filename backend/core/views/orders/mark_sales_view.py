from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from core.models import Order
from core.serializers.order_mark_sales import MarkSalesSerializer
from core.services.audit import write_audit_log


class OrderMarkSalesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response({"detail": "注文が見つかりません"}, status=404)

        serializer = MarkSalesSerializer(order, data=request.data or {}, partial=True)

        if serializer.is_valid():
            serializer.save()

            try:
                write_audit_log(
                    request=request,
                    action="order.mark_sales",
                    target_type="order",
                    target_id=order.id,
                    summary=f"受注 #{order.order_no} を売上計上しました（売上日: {serializer.data.get('sales_date', '')}）",
                )
            except Exception:
                pass

            return Response({"detail": "売上計上しました", "sales_date": serializer.data["sales_date"]})

        return Response(serializer.errors, status=400)
