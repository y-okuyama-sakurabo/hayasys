from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import Color
from core.serializers.masters import ColorSerializer

class ColorListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Color.objects.order_by("id")
        return Response(ColorSerializer(qs, many=True).data)