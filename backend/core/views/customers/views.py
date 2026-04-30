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
import csv
import io
from urllib.parse import quote
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.views import APIView

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
        q = self.request.query_params.get("search") 

        if q:
    
            q_norm = jaconv.normalize(q, "NFKC")
            q_hira = jaconv.kata2hira(q_norm)
            q_kata = jaconv.hira2kata(q_norm)

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
    
class CustomerCSVExportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Customer.objects.all().order_by("id")

        # =========================
        # 店舗制限
        # =========================
        user = request.user

        if not getattr(user, "is_superuser", False) and getattr(user, "shop_id", None):
            qs = qs.filter(
                Q(first_shop_id=user.shop_id) | Q(last_shop_id=user.shop_id)
            )

        # =========================
        # 検索条件
        # =========================
        search = request.query_params.get("search")
        customer_class = request.query_params.get("customer_class")
        region = request.query_params.get("region")
        gender = request.query_params.get("gender")

        if search:
            q_norm = jaconv.normalize(search, "NFKC")
            q_hira = jaconv.kata2hira(q_norm)
            q_kata = jaconv.hira2kata(q_norm)

            qs = qs.filter(
                Q(name__icontains=q_norm)
                | Q(name__icontains=q_hira)
                | Q(name__icontains=q_kata)
                | Q(kana__icontains=q_norm)
                | Q(kana__icontains=q_hira)
                | Q(kana__icontains=q_kata)
                | Q(phone__icontains=q_norm)
                | Q(mobile_phone__icontains=q_norm)
                | Q(company_phone__icontains=q_norm)
                | Q(address__icontains=q_norm)
                | Q(postal_code__icontains=q_norm)
                | Q(email__icontains=q_norm)
                | Q(company__icontains=q_norm)
            )

        if customer_class:
            qs = qs.filter(customer_class_id=customer_class)

        if region:
            qs = qs.filter(region_id=region)

        if gender:
            qs = qs.filter(gender_id=gender)

        # =========================
        # CSV作成
        # =========================
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "顧客ID",
            "顧客区分",
            "氏名",
            "フリガナ",
            "会社名",
            "郵便番号",
            "住所",
            "電話番号",
            "携帯番号",
            "会社電話番号",
            "メールアドレス",
            "生年月日",
            "性別",
            "地域",
            "初回店舗",
            "最終店舗",
            "担当者",
            "登録日",
        ])

        for customer in qs.select_related(
            "customer_class",
            "gender",
            "region",
            "first_shop",
            "last_shop",
            "staff",
        ):
            writer.writerow([
                customer.id,
                customer.customer_class.name if customer.customer_class else "",
                customer.name or "",
                customer.kana or "",
                customer.company or "",
                customer.postal_code or "",
                customer.address or "",
                customer.phone or "",
                customer.mobile_phone or "",
                customer.company_phone or "",
                customer.email or "",
                customer.birthdate.strftime("%Y-%m-%d") if customer.birthdate else "",
                customer.gender.name if customer.gender else "",
                customer.region.name if customer.region else "",
                customer.first_shop.name if customer.first_shop else "",
                customer.last_shop.name if customer.last_shop else "",
                customer.staff.display_name if customer.staff else "",
                customer.created_at.strftime("%Y-%m-%d") if customer.created_at else "",
            ])

        today = timezone.localdate().strftime("%Y%m%d")
        filename = f"customers_{today}.csv"

        csv_data = output.getvalue().encode("cp932", errors="replace")

        response = HttpResponse(
            csv_data,
            content_type="text/csv; charset=cp932",
        )
        response["Content-Disposition"] = (
            f"attachment; filename*=UTF-8''{quote(filename)}"
        )

        return response
