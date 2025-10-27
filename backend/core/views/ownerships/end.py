from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.models import CustomerVehicle
from core.serializers.ownerships import OwnershipEndSerializer
from core.serializers.customers import CustomerDetailSerializer

class OwnershipEndView(APIView):
    """
    PATCH /api/ownerships/<int:pk>/end/
    body: { "owned_to": "2026-04-01" }
    """
    permission_classes = [IsAuthenticated]
    def patch(self, request, pk:int):
        try:
            ov = CustomerVehicle.objects.get(pk=pk)
        except CustomerVehicle.DoesNotExist:
            return Response({"detail":"Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = OwnershipEndSerializer(instance=ov, data=request.data, partial=True)
        if ser.is_valid():
            ov = ser.save()
            return Response(CustomerDetailSerializer(ov.customer).data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
