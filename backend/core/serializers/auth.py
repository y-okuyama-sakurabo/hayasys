# core/serializers/auth.py
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # トークンにもユーザー情報を含める
        token["login_id"] = user.login_id
        token["role"] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # レスポンスに user 情報を追加
        data["user"] = {
            "id": self.user.id,
            "login_id": self.user.login_id,
            "role": self.user.role,
        }
        return data
