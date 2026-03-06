from rest_framework import generics, permissions
from core.models import VehicleWarranty
from core.serializers.vehicles import VehicleWarrantySerializer


class VehicleWarrantyListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VehicleWarrantySerializer

    def get_queryset(self):
        vehicle_id = self.kwargs["vehicle_id"]

        return VehicleWarranty.objects.filter(
            vehicle_id=vehicle_id
        ).order_by("-id")

    def perform_create(self, serializer):
        vehicle_id = self.kwargs["vehicle_id"]

        serializer.save(
            vehicle_id=vehicle_id
        )


class VehicleWarrantyRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VehicleWarrantySerializer
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        vehicle_id = self.kwargs["vehicle_id"]

        return VehicleWarranty.objects.filter(
            vehicle_id=vehicle_id
        )