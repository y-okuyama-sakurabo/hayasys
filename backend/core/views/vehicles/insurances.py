from rest_framework import generics, permissions
from core.models import VehicleInsurance
from core.serializers.vehicles import VehicleInsuranceSerializer


class VehicleInsuranceListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VehicleInsuranceSerializer

    def get_queryset(self):
        vehicle_id = self.kwargs["vehicle_id"]

        return VehicleInsurance.objects.filter(
            vehicle_id=vehicle_id
        ).order_by("-start_date")

    def perform_create(self, serializer):
        vehicle_id = self.kwargs["vehicle_id"]

        serializer.save(
            vehicle_id=vehicle_id
        )


class VehicleInsuranceRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VehicleInsuranceSerializer
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        vehicle_id = self.kwargs["vehicle_id"]

        return VehicleInsurance.objects.filter(
            vehicle_id=vehicle_id
        )