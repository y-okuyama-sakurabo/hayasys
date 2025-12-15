# core/views/payment_management.py
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.models.order_delivery_payment import PaymentManagement, PaymentRecord
from core.serializers.payment_management import PaymentRecordSerializer
from core.models import Order
from core.serializers.payment_management import PaymentManagementSerializer

class PaymentManagementDetailAPIView(generics.RetrieveAPIView):
    serializer_class = PaymentManagementSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        order_id = self.kwargs["order_id"]
        order = Order.objects.get(id=order_id)
        pm, created = PaymentManagement.objects.get_or_create(order=order)
        return pm

class PaymentRecordCreateAPIView(generics.CreateAPIView):
    serializer_class = PaymentRecordSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        order_id = self.kwargs["order_id"]

        # --- order が存在するか確認 ---
        order = Order.objects.get(id=order_id)

        # --- PaymentManagement を自動生成 or 取得 ---
        pm, created = PaymentManagement.objects.get_or_create(order=order)

        # --- 入金追加 ---
        serializer.save(payment_management=pm)

class PaymentRecordDeleteAPIView(generics.DestroyAPIView):
    queryset = PaymentRecord.objects.all()
    serializer_class = PaymentRecordSerializer
    permission_classes = [IsAuthenticated]
