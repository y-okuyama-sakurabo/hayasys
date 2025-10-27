from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.models import CustomerVehicle

class OwnershipDeleteView(APIView):
    """
    DELETE /api/ownerships/<int:pk>/
    """
    permission_classes = [IsAuthenticated]
    def delete(self, request, pk:int):
        try:
            CustomerVehicle.objects.get(pk=pk).delete()
        except CustomerVehicle.DoesNotExist:
            return Response({"detail":"Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
