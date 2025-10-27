from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import Shop
from core.serializers.masters import ShopSerializer


class ShopListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Shop.objects.order_by("id")
        return Response(ShopSerializer(qs, many=True).data)
