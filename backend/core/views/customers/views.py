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
import jaconv

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
            # ✅ 正規化：全角・半角・ひらがな・カタカナ両対応
            q_norm = jaconv.normalize(q, "NFKC")
            q_hira = jaconv.kata2hira(q_norm)
            q_kata = jaconv.hira2kata(q_norm)

            # ✅ kana がない顧客も対象にするため、nameでも必ずヒットさせる
            qs = qs.filter(
                Q(name__icontains=q_norm)
                | Q(name__icontains=q_hira)
                | Q(name__icontains=q_kata)
                | Q(kana__icontains=q_norm)
                | Q(kana__icontains=q_hira)
                | Q(kana__icontains=q_kata)
                | Q(phone__icontains=q_norm)
                | Q(mobile_phone__icontains=q_norm)
                | Q(address__icontains=q_norm)
                | Q(postal_code__icontains=q_norm)
                | Q(email__icontains=q_norm)
                | Q(company__icontains=q_norm)
                | Q(memos__body__icontains=q_norm)
                | Q(customer_vehicles__vehicle__registrations__registration_no__icontains=q_norm)
                | Q(customer_vehicles__vehicle__registrations__registration_area__icontains=q_norm)
            )

        return qs.annotate(
            owned_vehicle_count=Count(
                "customer_vehicles",
                filter=Q(customer_vehicles__owned_to__isnull=True),
            )
        ).order_by("id")

class CustomerRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset = Customer.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return CustomerWriteSerializer
        return CustomerDetailSerializer
