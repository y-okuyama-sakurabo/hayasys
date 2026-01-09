# core/views/ownerships/views.py
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from core.models import Customer, CustomerVehicle
from core.serializers.ownerships import (
    CustomerVehicleSerializer,
    CustomerVehicleCreateSerializer,
    CustomerVehicleWriteSerializer,
)

class CustomerVehicleListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: 顧客の所有車両一覧
      - ?status=current|past|all を将来入れたいならここで filter
    POST: 所有車両の登録
      - 現状は「車両新規作成＋所有関係登録」
      - 今後「vehicle_id 指定（既存Vehicle紐付け）」も対応させる
    """
    permission_classes = [IsAuthenticated]

    def get_customer(self):
        return get_object_or_404(Customer, pk=self.kwargs["customer_id"])

    def get_queryset(self):
        customer = self.get_customer()
        qs = CustomerVehicle.objects.filter(customer=customer).select_related("vehicle")
        # 拡張するなら:
        # status_ = self.request.query_params.get("status", "all")
        # if status_ == "current": qs = qs.filter(owned_to__isnull=True)
        # elif status_ == "past": qs = qs.filter(owned_to__isnull=False)
        return qs.order_by("-owned_to", "-owned_from", "-id")

    def get_serializer_class(self):
        return CustomerVehicleCreateSerializer if self.request.method == "POST" else CustomerVehicleSerializer

    def create(self, request, *args, **kwargs):
        customer = self.get_customer()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ownership = serializer.save(customer=customer)
        return Response(CustomerVehicleSerializer(ownership).data, status=status.HTTP_201_CREATED)


class CustomerVehicleRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: 所有関係詳細（Vehicle含む）
    PATCH/PUT: owned_from / owned_to 更新（手放しもここで対応可能）
    DELETE: 所有関係を削除
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CustomerVehicleSerializer
    lookup_url_kwarg = "customer_vehicle_id"

    def get_customer(self):
        return get_object_or_404(Customer, pk=self.kwargs["customer_id"])

    def get_queryset(self):
        # customer配下に限定して誤操作防止
        return CustomerVehicle.objects.filter(customer=self.get_customer()).select_related("vehicle")



class CustomerVehicleRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "customer_vehicle_id"

    def get_customer(self):
        return get_object_or_404(Customer, pk=self.kwargs["customer_id"])

    def get_queryset(self):
        return CustomerVehicle.objects.filter(customer=self.get_customer()).select_related("vehicle")

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return CustomerVehicleWriteSerializer
        return CustomerVehicleSerializer