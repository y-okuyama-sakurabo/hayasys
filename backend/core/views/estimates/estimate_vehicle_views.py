from rest_framework import generics, permissions
from core.models.estimate_vehicle import EstimateVehicle
from core.models.estimates import Estimate
from core.serializers.estimate_vehicles import EstimateVehicleSerializer

class EstimateVehicleListCreateAPIView(generics.ListCreateAPIView):
    """
    特定の見積に紐づく車両情報（商談・下取り）の取得・登録
    """
    serializer_class = EstimateVehicleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        estimate_id = self.kwargs.get("estimate_id")
        if estimate_id:
            return EstimateVehicle.objects.filter(estimate_id=estimate_id)
        return EstimateVehicle.objects.none()

    def perform_create(self, serializer):
        estimate = Estimate.objects.get(pk=self.kwargs["estimate_id"])
        serializer.save(estimate=estimate)


class EstimateVehicleRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    個別車両情報の取得・更新・削除
    """
    queryset = EstimateVehicle.objects.all()
    serializer_class = EstimateVehicleSerializer
    permission_classes = [permissions.IsAuthenticated]
