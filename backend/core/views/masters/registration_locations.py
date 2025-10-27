from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import RegistrationLocation
from core.serializers.masters import RegistrationLocationSerializer

class RegistrationLocationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = RegistrationLocation.objects.order_by("id")
        return Response(RegistrationLocationSerializer(qs, many=True).data)
