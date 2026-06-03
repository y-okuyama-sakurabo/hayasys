from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from core.models import Shop
from core.serializers.masters import ShopSerializer


class ShopListCreateView(generics.ListCreateAPIView):
    queryset = Shop.objects.order_by("id")
    serializer_class = ShopSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None


class ShopRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Shop.objects.all()
    serializer_class = ShopSerializer
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        shop = self.get_object()
        shop.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ShopUsageAPIView(APIView):
    """GET /masters/shops/{pk}/usage/ — 削除前の使用状況チェック"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        try:
            shop = Shop.objects.get(pk=pk)
        except Shop.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        from django.contrib.auth import get_user_model
        from core.models.estimates import Estimate
        from core.models.orders import Order

        User = get_user_model()

        users     = User.objects.filter(shop=shop).count()
        estimates = Estimate.objects.filter(shop=shop).count()
        orders    = Order.objects.filter(shop=shop).count()

        return Response({
            "users":     users,
            "estimates": estimates,
            "orders":    orders,
        })
