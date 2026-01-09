from rest_framework import generics, permissions
from django.shortcuts import get_object_or_404
from core.models import Customer, CustomerVehicle
from core.serializers.customer_vehicles import (
    CustomerVehicleReadSerializer,
    CustomerVehicleWriteSerializer,
)

class CustomerVehicleListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_customer(self):
        return get_object_or_404(Customer, pk=self.kwargs["customer_id"])

    def get_queryset(self):
        customer = self.get_customer()
        qs = (
            CustomerVehicle.objects
            .filter(customer=customer)
            .select_related("vehicle", "vehicle__manufacturer", "vehicle__category", "vehicle__color")
            .prefetch_related("vehicle__registrations")  # mini/detail側で first() 使うならこれでOK
            .order_by("-owned_to", "-owned_from", "-id")
        )

        status_ = self.request.query_params.get("status", "all")
        if status_ == "current":
            qs = qs.filter(owned_to__isnull=True)
        elif status_ == "past":
            qs = qs.filter(owned_to__isnull=False)

        # q で絞り込み（任意：chassis_noや車名）
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(vehicle__chassis_no__icontains=q) | qs.filter(vehicle__vehicle_name__icontains=q)

        return qs

    def get_serializer_class(self):
        return CustomerVehicleWriteSerializer if self.request.method == "POST" else CustomerVehicleReadSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["customer"] = self.get_customer()
        return ctx


class CustomerVehicleRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = "customer_vehicle_id"

    def get_customer(self):
        return get_object_or_404(Customer, pk=self.kwargs["customer_id"])

    def get_queryset(self):
        return (
            CustomerVehicle.objects
            .filter(customer=self.get_customer())
            .select_related("vehicle", "vehicle__manufacturer", "vehicle__category", "vehicle__color")
            .prefetch_related("vehicle__registrations", "vehicle__insurances", "vehicle__warranties", "vehicle__memos")
        )

    def get_serializer_class(self):
        return CustomerVehicleWriteSerializer if self.request.method in ["PUT", "PATCH"] else CustomerVehicleReadSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["customer"] = self.get_customer()
        return ctx
