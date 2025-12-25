# core/views/customers/similar.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db.models import Q

from core.models import Customer


class SimilarCustomerAPIView(APIView):
    """
    顧客の重複候補を検索するAPI
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
                status=status.HTTP_400_BAD_REQUEST,
            )

        q = Q()

        # --------------------
        # 電話番号正規化
        # --------------------
        def normalize_phone(p):
            return p.replace("-", "").replace(" ", "") if p else None

        phone_norm = normalize_phone(phone)

        # --------------------
        # 名前
        # --------------------
        if name:
            q |= Q(name__icontains=name)

        # --------------------
        # 電話
        # --------------------
        if phone_norm:
            q |= Q(phone__icontains=phone_norm)

        # --------------------
        # メール
        # --------------------
        if email:
            q |= Q(email=email)

        # --------------------
        # 住所（補助）
        # --------------------
        if address:
            q |= Q(address__icontains=address)

        similar = Customer.objects.filter(q).distinct()

        return Response(
            {
                "has_similar": similar.exists(),
                "candidates": [
                    {
                        "id": c.id,
                        "name": c.name,
                        "phone": c.phone,
                        "email": c.email,
                        "address": c.address,
                    }
                    for c in similar
                ],
            },
            status=status.HTTP_200_OK,
        )
