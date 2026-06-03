from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from core.serializers.auth import CustomTokenObtainPairSerializer


class AuthUserAPIView(APIView):
    """
    ログイン中のユーザー情報を返すAPI
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "login_id": user.login_id,
            "display_name": getattr(user, "display_name", None),
            "role": getattr(user, "role", None),
            "email": user.email,
            "shop_id": getattr(user, "shop_id", None),
            "shop_name": getattr(user.shop, "name", None) if hasattr(user, "shop") else None,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        })


class LoginView(TokenObtainPairView):
    """
    カスタムログインAPI
    - JWT を HttpOnly Cookie に保存
    - レスポンスも token + user を返す
    - 成功時に操作ログを記録する
    """
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        access  = response.data.get("access")
        refresh = response.data.get("refresh")

        response.set_cookie(
            "access_token", access,
            httponly=True, secure=False, samesite="Lax",
            max_age=60 * 60, path="/",
        )
        response.set_cookie(
            "refresh_token", refresh,
            httponly=True, secure=False, samesite="Lax",
            max_age=60 * 60 * 24 * 7, path="/",
        )

        # ── 操作ログ ──
        if response.status_code == 200:
            user_info = response.data.get("user", {})
            user_id   = user_info.get("id")
            if user_id:
                try:
                    from django.contrib.auth import get_user_model
                    from core.models import AuditLog
                    from core.services.audit import get_client_ip

                    User  = get_user_model()
                    actor = User.objects.get(id=user_id)
                    AuditLog.objects.create(
                        actor=actor,
                        shop=getattr(actor, "shop", None),
                        action="auth.login",
                        target_type="user",
                        target_id=actor.id,
                        summary=f"{actor.display_name or actor.login_id} がログインしました",
                        ip=get_client_ip(request),
                        user_agent=request.META.get("HTTP_USER_AGENT", "")[:2000],
                    )
                except Exception:
                    pass  # ログ失敗でもログイン自体は成功させる

        return response
