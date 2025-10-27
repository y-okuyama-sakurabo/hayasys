from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import Manufacturer
from core.serializers.masters import ManufacturerSerializer

class ManufacturerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Manufacturer.objects.order_by("id")
        return Response(ManufacturerSerializer(qs, many=True).data)