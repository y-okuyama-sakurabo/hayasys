from rest_framework import serializers
from core.models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    actor_login_id = serializers.CharField(source="actor.login_id", read_only=True)
    actor_display_name = serializers.CharField(source="actor.display_name", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "created_at",
            "action",
            "summary",
            "target_type",
            "target_id",
            "diff",
            "ip",
            "user_agent",
            "actor",
            "actor_login_id",
            "actor_display_name",
            "shop",
        ]
