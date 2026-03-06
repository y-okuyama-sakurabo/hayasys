from rest_framework import generics, permissions
from core.models.estimate_vehicle import EstimateVehicle
from core.models.estimates import Estimate
from core.models import Product, EstimateItem
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
        vehicle = serializer.save(estimate=estimate)

        # ---- Product 自動登録 ----
        if vehicle.vehicle_name and vehicle.category:
            Product.objects.get_or_create(
                name=vehicle.vehicle_name,
                category=vehicle.category,
                manufacturer=vehicle.manufacturer,
                defaults={
                    "unit_price": vehicle.unit_price or 0,
                    "tax_type": "taxable",
                },
            )


class EstimateVehicleRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    個別車両情報の取得・更新・削除
    """
    queryset = EstimateVehicle.objects.all()
    serializer_class = EstimateVehicleSerializer
    permission_classes = [permissions.IsAuthenticated]
