# core/views/masters/unit.py

from rest_framework import generics
from core.models.unit import Unit
from core.serializers.unit import UnitSerializer


class UnitListAPIView(generics.ListAPIView):
    queryset = Unit.objects.all().order_by("id")
    serializer_class = UnitSerializer