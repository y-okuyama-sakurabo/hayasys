# core/authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication

class CookieJWTAuthentication(JWTAuthentication):
    """
    Authorizationヘッダが無ければ access_token Cookie を使うJWT認証
    """
    def authenticate(self, request):
        header = self.get_header(request)
        raw_token = None

        # 1. Authorization ヘッダ優先
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            # 2. 無ければ Cookie から取得
            cookie_token = request.COOKIES.get("access_token")
            if cookie_token:
                raw_token = cookie_token

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
