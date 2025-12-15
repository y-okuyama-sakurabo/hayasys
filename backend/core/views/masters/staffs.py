from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from core.serializers.masters import StaffSerializer

User = get_user_model()


class StaffListView(APIView):
    """
    スタッフ一覧 + スタッフ登録（管理者のみ）
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """スタッフ一覧（全ログインユーザーが閲覧可能）"""
        qs = (
            User.objects.filter(is_active=True)
            .select_related("shop")
            .order_by("id")
        )
        serializer = StaffSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        """スタッフ登録（管理者のみ許可）"""
        user = request.user

        # ✅ 「admin」ロール or superuser のどちらでも登録可能にする
        if not (user.is_superuser or getattr(user, "role", "") == "admin"):
            return Response(
                {"detail": "スタッフの追加は管理者のみ可能です。"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = StaffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # ✅ create() 内で set_password が呼ばれているため、重複呼び出しを防止
        staff = serializer.save()

        return Response(
            StaffSerializer(staff).data,
            status=status.HTTP_201_CREATED,
        )
