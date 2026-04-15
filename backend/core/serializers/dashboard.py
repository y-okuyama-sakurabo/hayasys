# core/serializers/dashboard.py

from rest_framework import serializers


class DashboardCommunicationSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    customer = serializers.CharField(allow_null=True)
    last_message = serializers.CharField(allow_null=True)
    last_message_at = serializers.DateTimeField(allow_null=True)
    is_pending = serializers.BooleanField()

class DashboardScheduleSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    start_at = serializers.DateTimeField()
    customer = serializers.CharField(allow_null=True)
    type = serializers.CharField()

class DashboardEstimateSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    estimate_no = serializers.CharField()
    customer = serializers.CharField(allow_null=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=0)
    staff = serializers.CharField()
    date = serializers.DateField()

class DashboardSerializer(serializers.Serializer):
    communications = DashboardCommunicationSerializer(many=True)
    schedules = DashboardScheduleSerializer(many=True)
    estimates = DashboardEstimateSerializer(many=True)