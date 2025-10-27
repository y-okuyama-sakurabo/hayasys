from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from core.serializers.masters import StaffSerializer

User = get_user_model()


class StaffListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = User.objects.filter(is_active=True).order_by("id")
        return Response(StaffSerializer(qs, many=True).data)
