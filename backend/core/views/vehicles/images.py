from rest_framework import generics
from core.models import VehicleImage, Vehicle
from core.serializers.vehicles import VehicleImageSerializer

class VehicleImageListCreateView(generics.ListCreateAPIView):
    serializer_class = VehicleImageSerializer

    def get_queryset(self):
        vehicle_id = self.kwargs["vehicle_id"]
        return VehicleImage.objects.filter(vehicle_id=vehicle_id)

    def perform_create(self, serializer):
        vehicle_id = self.kwargs["vehicle_id"]
        # 外部キーなので customer を渡す
        vehicle = Vehicle.objects.get(pk=vehicle_id)
        serializer.save(vehicle=vehicle)


class VehicleImageDeleteView(generics.DestroyAPIView):
    serializer_class = VehicleImageSerializer
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        vehicle_id = self.kwargs["vehicle_id"]
        return VehicleImage.objects.filter(vehicle_id=vehicle_id)
