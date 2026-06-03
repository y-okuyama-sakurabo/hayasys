from rest_framework.views import APIView
from rest_framework.response import Response


class LogoutView(APIView):
    def post(self, request):
        # ── 操作ログ ──
        user = request.user
        if user and getattr(user, "is_authenticated", False):
            try:
                from core.services.audit import write_audit_log
                write_audit_log(
                    request=request,
                    action="auth.logout",
                    target_type="user",
                    target_id=user.id,
                    summary=f"{getattr(user, 'display_name', None) or getattr(user, 'login_id', '')} がログアウトしました",
                )
            except Exception:
                pass

        response = Response({"detail": "logged out"})
        response.delete_cookie("access_token",  path="/")
        response.delete_cookie("refresh_token", path="/")
        return response
