from rest_framework import generics, permissions
from core.models import VehicleRegistration
from core.serializers.vehicle_registrations import VehicleRegistrationSerializer

class VehicleRegistrationListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VehicleRegistrationSerializer

    def get_queryset(self):
        return VehicleRegistration.objects.filter(vehicle_id=self.kwargs["vehicle_id"]).order_by("-id")

    def perform_create(self, serializer):
        serializer.save(vehicle_id=self.kwargs["vehicle_id"])

class VehicleRegistrationRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VehicleRegistrationSerializer

    def get_queryset(self):
        return VehicleRegistration.objects.filter(vehicle_id=self.kwargs["vehicle_id"])