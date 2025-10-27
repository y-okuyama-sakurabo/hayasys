from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import CustomerClass
from core.serializers.masters import CustomerClassSerializer

class CustomerClassListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = CustomerClass.objects.order_by("id")
        return Response(CustomerClassSerializer(qs, many=True).data)