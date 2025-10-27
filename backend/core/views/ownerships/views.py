# core/views/ownerships.py
from rest_framework import generics, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from core.models import Customer, CustomerVehicle
from core.serializers.ownerships import CustomerVehicleSerializer, CustomerVehicleCreateSerializer

class CustomerVehicleListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: 顧客の所有車両一覧
    POST: 車両新規作成＋所有関係登録
    """
    def get_queryset(self):
        customer_id = self.kwargs["customer_id"]
        return CustomerVehicle.objects.filter(customer_id=customer_id).select_related("vehicle")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CustomerVehicleCreateSerializer
        return CustomerVehicleSerializer

    def create(self, request, *args, **kwargs):
        customer = get_object_or_404(Customer, pk=self.kwargs["customer_id"])
        serializer = CustomerVehicleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ownership = serializer.save(customer=customer)
        return Response(CustomerVehicleSerializer(ownership).data, status=status.HTTP_201_CREATED)


class CustomerVehicleRetrieveDestroyAPIView(generics.RetrieveDestroyAPIView):
    """
    GET: 所有関係詳細（Vehicle含む）
    DELETE: 所有関係を削除
    """
    queryset = CustomerVehicle.objects.all().select_related("vehicle")
    serializer_class = CustomerVehicleSerializer
    lookup_field = "id"
