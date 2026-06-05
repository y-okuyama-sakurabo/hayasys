from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from core.models.base import CompanySettings
from core.serializers.masters import CompanySettingsSerializer


class CompanySettingsAPIView(APIView):
    """GET /company-settings/  PATCH /company-settings/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        obj = CompanySettings.get()
        return Response(CompanySettingsSerializer(obj).data)

    def patch(self, request):
        obj = CompanySettings.get()
        serializer = CompanySettingsSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
