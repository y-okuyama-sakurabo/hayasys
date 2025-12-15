from rest_framework import generics, permissions
from core.models import EstimateParty
from core.serializers.estimates import EstimatePartySerializer


class EstimatePartyListCreateAPIView(generics.ListCreateAPIView):
    """
    顧客スナップショット一覧・作成
    """
    queryset = EstimateParty.objects.all().select_related(
        "customer_class", 
        "region", 
        "gender"
    ).order_by("-created_at")
    serializer_class = EstimatePartySerializer
    permission_classes = [permissions.IsAuthenticated]


class EstimatePartyRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    顧客スナップショット単体取得・更新・削除
    """
    queryset = EstimateParty.objects.all().select_related(
        "customer_class", 
        "region", 
        "gender"
    )
    serializer_class = EstimatePartySerializer
    permission_classes = [permissions.IsAuthenticated]
