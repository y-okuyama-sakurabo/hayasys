# core/views/customers/similar.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db.models import Q

from core.models import Customer


class SimilarCustomerAPIView(APIView):
    """
    顧客の重複候補を検索するAPI。
    受注作成・見積作成時に利用。
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        name = request.data.get("name")
        phone = request.data.get("phone")
        email = request.data.get("email")
        address = request.data.get("address")

        if not name and not phone and not email:
            return Response(
                {"detail": "name / phone / email のいずれかは必要です"},
                status=400,
            )

        # ==============================
        # 類似候補の検索ロジック
        # ==============================

        q = Q()

        # ● 名前＋電話 or 名前＋メール
        if name and phone:
            q |= Q(name=name, phone=phone)
        if name and email:
            q |= Q(name=name, email=email)

        # ● 電話だけ一致
        if phone:
            q |= Q(phone=phone)

        # ● メールだけ一致
        if email:
            q |= Q(email=email)

        # ● 住所一致（任意。強すぎるので一応）
        if address:
            q |= Q(address__icontains=address)

        similar = Customer.objects.filter(q).distinct()

        # ==============================
        # レスポンス作成
        # ==============================
        if not similar.exists():
            return Response(
                {
                    "has_similar": False,
                    "candidates": []
                },
                status=200,
            )

        return Response(
            {
                "has_similar": True,
                "candidates": [
                    {
                        "id": c.id,
                        "name": c.name,
                        "phone": c.phone,
                        "email": c.email,
                        "address": c.address,
                    }
                    for c in similar
                ]
            },
            status=200,
        )
