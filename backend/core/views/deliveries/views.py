# core/views/deliveries/views.py
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.models import Order, OrderItem
from core.models.order_delivery_payment import Delivery, DeliveryItem
from core.serializers.delivery import DeliverySerializer
from django.db import transaction
import datetime

class DeliveryCreateAPIView(generics.CreateAPIView):
    serializer_class = DeliverySerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        order_id = request.data.get("order")

        if not order_id:
            return Response({"detail": "order が必要です"}, status=400)

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({"detail": "注文が存在しません"}, status=404)

        # serializer に order を渡す
        serializer = self.get_serializer(
            data=request.data,
            context={"order": order}
        )

        serializer.is_valid(raise_exception=True)
        delivery = serializer.save()  # Delivery + DeliveryItem が正しく作られる

        return Response(
            {
                "detail": "納品登録が完了しました",
                "delivery_id": delivery.id
            },
            status=201
        )

class DeliveryUpdateAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["order"] = self.get_object().order  # update 用
        return context

    def perform_destroy(self, instance):
        order = instance.order
        super().perform_destroy(instance)

        # 残った Delivery のステータス再計算
        for d in order.deliveries.all():
            d.update_status()

