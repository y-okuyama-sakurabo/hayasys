from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from core.models import Customer
from core.serializers.customers import (
    CustomerListSerializer,
    CustomerWriteSerializer,
    CustomerDetailSerializer,
)
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from rest_framework.pagination import PageNumberPagination

class DefaultPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class CustomerListCreateView(ListCreateAPIView):
    queryset = Customer.objects.all()
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CustomerWriteSerializer
        return CustomerListSerializer

    def get_queryset(self):
        qs = Customer.objects.all()
        q = self.request.query_params.get("search")  # ← ?search=キーワード

        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(kana__icontains=q)
                | Q(phone__icontains=q)
                | Q(mobile_phone__icontains=q)
                | Q(address__icontains=q)
                | Q(postal_code__icontains=q)
                | Q(email__icontains=q)
                | Q(company__icontains=q)
                | Q(memos__body__icontains=q)  # ← 顧客メモ本文で検索
                | Q(customer_vehicles__vehicle__registrations__registation_no__icontains=q)
                | Q(customer_vehicles__vehicle__registrations__registation_area__icontains=q)

            )

        return qs.annotate(
            owned_vehicle_count=Count(
                "customer_vehicles",
                filter=Q(customer_vehicles__owned_to__isnull=True),
            )
        ).order_by("-id")


class CustomerRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset = Customer.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return CustomerWriteSerializer
        return CustomerDetailSerializer
