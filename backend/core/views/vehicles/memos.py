from rest_framework import generics
from core.models import VehicleMemo
from core.serializers.vehicles import VehicleMemosSerializer

class VehicleMemoListCreateView(generics.ListCreateAPIView):
    serializer_class = VehicleMemosSerializer

    def get_queryset(self):
        vehicle_id = self.kwargs["vehicle_id"]
        # 論理削除されていないメモのみ
        return VehicleMemo.objects.filter(
            vehicle_id=vehicle_id,
            deleted_at__isnull=True
        ).order_by("-created_at")

    def perform_create(self, serializer):
        vehicle_id = self.kwargs["vehicle_id"]
        serializer.save(
            vehicle_id=vehicle_id,
            created_by=self.request.user  # ← ここだけ顧客版との違い
        )


class VehicleMemoDeleteView(generics.DestroyAPIView):
    serializer_class = VehicleMemosSerializer
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        vehicle_id = self.kwargs["vehicle_id"]
        return VehicleMemo.objects.filter(vehicle_id=vehicle_id, deleted_at__isnull=True)
