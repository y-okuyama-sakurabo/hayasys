from typing import Any, Optional, Dict
from core.models import AuditLog


def get_client_ip(request) -> Optional[str]:
    # まずは最小。必要ならX-Forwarded-For対応を追加
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def write_audit_log(
    *,
    request,
    action: str,
    target_type: str = "",
    target_id: Optional[int] = None,
    summary: str = "",
    diff: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    user = getattr(request, "user", None)
    actor = user if getattr(user, "is_authenticated", False) else None
    shop = getattr(actor, "shop", None) if actor else None

    return AuditLog.objects.create(
        actor=actor,
        shop=shop,
        action=action,
        target_type=target_type,
        target_id=target_id,
        summary=summary,
        diff=diff,
        ip=get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:2000],
    )
