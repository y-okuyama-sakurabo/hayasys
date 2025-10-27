from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import Region
from core.serializers.masters import RegionSerializer


class RegionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Region.objects.order_by("id")
        return Response(RegionSerializer(qs, many=True).data)
