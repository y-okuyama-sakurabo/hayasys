from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import Gender
from core.serializers.masters import GenderSerializer


class GenderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Gender.objects.order_by("id")
        return Response(GenderSerializer(qs, many=True).data)
