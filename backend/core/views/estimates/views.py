# core/views/estimates/views.py
from rest_framework import generics, permissions
from core.models import Estimate
from core.serializers.estimates import EstimateSerializer


class EstimateListCreateAPIView(generics.ListCreateAPIView):
    queryset = Estimate.objects.all().select_related("party", "shop", "created_by")
    serializer_class = EstimateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class EstimateRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Estimate.objects.all().select_related("party", "shop", "created_by")
    serializer_class = EstimateSerializer
    permission_classes = [permissions.IsAuthenticated]
