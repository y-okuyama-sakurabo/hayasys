from rest_framework import generics
from core.models import CustomerImage, Customer
from core.serializers.customers import CustomerImageSerializer

class CustomerImageListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerImageSerializer

    def get_queryset(self):
        customer_id = self.kwargs["customer_id"]
        return CustomerImage.objects.filter(customer_id=customer_id)

    def perform_create(self, serializer):
        customer_id = self.kwargs["customer_id"]
        # 外部キーなので customer を渡す
        customer = Customer.objects.get(pk=customer_id)
        serializer.save(customer=customer)


class CustomerImageDeleteView(generics.DestroyAPIView):
    serializer_class = CustomerImageSerializer
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        customer_id = self.kwargs["customer_id"]
        return CustomerImage.objects.filter(customer_id=customer_id)
