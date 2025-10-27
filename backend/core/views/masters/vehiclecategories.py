from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import VehicleCategory
from core.serializers.masters import VehicleCategorySerializer

class VehicleCategoryListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = VehicleCategory.objects.order_by("id")
        return Response(VehicleCategorySerializer(qs, many=True).data)