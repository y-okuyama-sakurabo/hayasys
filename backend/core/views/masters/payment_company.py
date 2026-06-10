# core/views/masters/payment_company.py
from rest_framework import generics, permissions
from core.models.payment_company import PaymentCompany
from core.serializers.payment_company import PaymentCompanySerializer


class PaymentCompanyListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PaymentCompanySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = PaymentCompany.objects.all()
        payment_type = self.request.query_params.get("type")
        if payment_type:
            qs = qs.filter(payment_type=payment_type, is_active=True)
        return qs.order_by("sort_order", "id")


class PaymentCompanyRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PaymentCompany.objects.all()
    serializer_class = PaymentCompanySerializer
    permission_classes = [permissions.IsAuthenticated]
