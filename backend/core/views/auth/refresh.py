from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

class CookieTokenRefreshView(TokenRefreshView):
    """
    refresh_token Cookie から新しい access_token を発行し
    Cookie に再セットする
    """
    serializer_class = TokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        data = request.data.copy()

        # Cookie から refresh_token を取得
        if "refresh" not in data:
            ref = request.COOKIES.get("refresh_token")
            if not ref:
                return Response({"detail": "refresh token missing"}, status=400)
            data["refresh"] = ref

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        new_access = serializer.validated_data["access"]

        # 新しい access_token を Cookie にセット
        response = Response({"access": new_access})

        response.set_cookie(
            "access_token",
            new_access,
            httponly=True,
            secure=False,    # 本番は True
            samesite="Lax",
            max_age=60 * 60,  # 1時間
            path="/",
        )

        return response
