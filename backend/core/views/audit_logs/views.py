import django_filters
from rest_framework import viewsets, permissions
from rest_framework.filters import SearchFilter, OrderingFilter

from core.models import AuditLog
from core.serializers.audit_log import AuditLogSerializer


class AuditLogFilter(django_filters.FilterSet):
    from_dt = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="gte")
    to_dt = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = AuditLog
        fields = ["action", "actor", "shop", "target_type", "target_id"]


class CanViewAuditLogs(permissions.BasePermission):
    # 現状：admin / staff だけ
    allowed_roles = {"admin"}

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, "role", None) in self.allowed_roles)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [CanViewAuditLogs]
    filterset_class = AuditLogFilter

    # 検索・並び替えも使いたいなら（任意）
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["summary", "action", "target_type", "actor__login_id", "actor__display_name"]
    ordering_fields = ["created_at", "action"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = AuditLog.objects.select_related("actor", "shop").all()
        u = self.request.user

        # adminでも店舗スコープで絞る（User.shopベース）
        if getattr(u, "shop_id", None):
            return qs.filter(shop_id=u.shop_id)

        # shopなしadmin（本部想定）は全件
        return qs
