# core/views/orders/order_vehicle_views.py
from rest_framework import generics, permissions
from core.models.order_vehicle import OrderVehicle
from core.models import Order
from core.serializers.order_vehicles import OrderVehicleSerializer


class OrderVehicleListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = OrderVehicleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        order_id = self.kwargs.get("order_id")
        if order_id:
            return OrderVehicle.objects.filter(order_id=order_id)
        return OrderVehicle.objects.none()

    def perform_create(self, serializer):
        order = Order.objects.get(pk=self.kwargs["order_id"])
        serializer.save(order=order)


class OrderVehicleRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = OrderVehicle.objects.all()
    serializer_class = OrderVehicleSerializer
    permission_classes = [permissions.IsAuthenticated]
