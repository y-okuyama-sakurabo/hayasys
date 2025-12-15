from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from core.models import Order
from core.serializers.order_mark_sales import MarkSalesSerializer


class OrderMarkSalesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """
        売上計上（sales_date をセットする）
        - payload に sales_date を送ればその日付で登録
        - なければ今日の日付になる
        """

        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=404)

        sales_date = request.data.get("sales_date")

        serializer = MarkSalesSerializer(
            order,
            data={"sales_date": sales_date},
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            "message": "売上計上しました",
            "order_id": order.id,
            "sales_date": serializer.data["sales_date"]
        }, status=status.HTTP_200_OK)
