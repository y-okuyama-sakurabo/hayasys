# core/views/payments.py
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.contrib.contenttypes.models import ContentType
from core.models.estimates import Estimate
from core.models.payments import Payment
from core.serializers.payment import PaymentSerializer

class EstimatePaymentListCreateView(generics.ListCreateAPIView):
    """
    見積に紐づく支払い情報の一覧・登録
    GET: /api/estimates/<estimate_id>/payments/
    POST: /api/estimates/<estimate_id>/payments/
    """
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(
            content_type=ContentType.objects.get_for_model(Estimate),
            object_id=self.kwargs["estimate_id"],
        ).order_by("id")

    def perform_create(self, serializer):
        estimate = Estimate.objects.get(pk=self.kwargs["estimate_id"])
        serializer.save(
            content_type=ContentType.objects.get_for_model(Estimate),
            object_id=estimate.id,
        )


class PaymentUpdateView(generics.UpdateAPIView):
    """
    支払い情報の更新
    PATCH: /api/payments/<id>/
    """
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
