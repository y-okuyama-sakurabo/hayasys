import django_filters
from rest_framework import viewsets, permissions, generics
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination

from core.models import AuditLog
from core.serializers.audit_log import AuditLogSerializer


class AuditLogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class AuditLogFilter(django_filters.FilterSet):
    from_dt = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="gte")
    to_dt   = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="lte")
    # 日付だけで絞れる補助フィルタ（YYYY-MM-DD）
    date_from = django_filters.DateFilter(field_name="created_at__date", lookup_expr="gte")
    date_to   = django_filters.DateFilter(field_name="created_at__date", lookup_expr="lte")

    class Meta:
        model = AuditLog
        fields = ["action", "actor", "shop", "target_type", "target_id"]


class CanViewAuditLogs(permissions.BasePermission):
    # admin / manager も許可する場合はここに追加
    allowed_roles = {"admin", "manager", "staff"}

    def has_permission(self, request, view):
        u = request.user
        return bool(
            u
            and u.is_authenticated
            and (u.is_superuser or getattr(u, "role", None) in self.allowed_roles)
        )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [CanViewAuditLogs]
    filterset_class = AuditLogFilter
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = [
        "summary", "action", "target_type",
        "actor__login_id", "actor__display_name",
    ]
    ordering_fields = ["created_at", "action"]
    ordering = ["-created_at"]
    pagination_class = AuditLogPagination

    def get_queryset(self):
        qs = AuditLog.objects.select_related("actor", "shop").all()
        u = self.request.user
        if getattr(u, "shop_id", None):
            return qs.filter(shop_id=u.shop_id)
        return qs


class AuditLogListAPIView(generics.ListAPIView):
    """GET /audit-logs/ — タイムライン一覧"""
    serializer_class = AuditLogSerializer
    permission_classes = [CanViewAuditLogs]
    filterset_class = AuditLogFilter
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = [
        "summary", "action", "target_type",
        "actor__login_id", "actor__display_name",
    ]
    ordering_fields = ["created_at", "action"]
    ordering = ["-created_at"]
    pagination_class = AuditLogPagination

    def get_queryset(self):
        qs = AuditLog.objects.select_related("actor", "shop").all()
        u = self.request.user
        if getattr(u, "shop_id", None):
            return qs.filter(shop_id=u.shop_id)
        return qs
