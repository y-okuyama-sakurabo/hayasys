from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.serializers.ownerships import OwnershipCreateSerializer
from core.serializers.customers import CustomerDetailSerializer
from core.models import Customer

class OwnershipCreateView(APIView):
    """
    POST /api/ownerships/
    body: { "customer": 1, "vehicle": 10, "owned_from": "2025-09-18" }
    """
    permission_classes = [IsAuthenticated]
    def post(self, request):
        ser = OwnershipCreateSerializer(data=request.data)
        if ser.is_valid():
            ov = ser.save()
            # 返り値は顧客詳細にすると便利（画面の再描画）
            return Response(CustomerDetailSerializer(ov.customer).data, status=status.HTTP_201_CREATED)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
