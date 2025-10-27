from rest_framework import generics
from core.models import CustomerMemo
from core.serializers.customers import CustomerMemosSerializer

class CustomerMemoListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerMemosSerializer

    def get_queryset(self):
        customer_id = self.kwargs["customer_id"]
        return CustomerMemo.objects.filter(customer_id=customer_id).order_by("-created_at")

    def perform_create(self, serializer):
        customer_id = self.kwargs["customer_id"]
        serializer.save(customer_id=customer_id)


class CustomerMemoDeleteView(generics.DestroyAPIView):
    serializer_class = CustomerMemosSerializer
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        customer_id = self.kwargs["customer_id"]
        return CustomerMemo.objects.filter(customer_id=customer_id)
