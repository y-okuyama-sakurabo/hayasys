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
    """
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        # 通常の JWT 発行処理
        response = super().post(request, *args, **kwargs)

        access = response.data.get("access")
        refresh = response.data.get("refresh")

        # ==== Cookie に保存 ====
        # 開発中なので secure=False ／ 本番にしたら True にしてね！

        response.set_cookie(
            "access_token",
            access,
            httponly=True,
            secure=False,      # 本番は True
            samesite="Lax",
            max_age=60 * 60,   # 1時間
            path="/",
        )

        response.set_cookie(
            "refresh_token",
            refresh,
            httponly=True,
            secure=False,         # 本番は True
            samesite="Lax",
            max_age=60 * 60 * 24 * 7,  # 7日
            path="/",
        )

        return response
