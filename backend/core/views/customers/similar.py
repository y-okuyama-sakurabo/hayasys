# core/views/customers/similar.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from django.db.models import Q, Value, IntegerField, BooleanField, Case, When, F
from django.db.models.functions import Replace

from core.models import Customer


class SimilarCustomerAPIView(APIView):
    """
    顧客の重複候補を検索するAPI（理由付き + スコア順）
    """
    permission_classes = [permissions.IsAuthenticated]

    # スコア重み（必要なら調整してOK）
    W_EMAIL_EXACT = 100
    W_PHONE_EXACT = 80
    W_MOBILE_EXACT = 80
    W_NAME_PARTIAL = 30
    W_KANA_PARTIAL = 30
    W_ADDRESS_PARTIAL = 10

    def post(self, request, *args, **kwargs):
        name = request.data.get("name")
        kana = request.data.get("kana")
        phone = request.data.get("phone")
        mobile_phone = request.data.get("mobile_phone")
        email = request.data.get("email")
        address = request.data.get("address")

        if not name and not kana and not phone and not mobile_phone and not email:
            return Response(
                {"detail": "name / kana / phone / mobile_phone / email のいずれかは必要です"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        def normalize_phone(p):
            if not p:
                return None
            return (
                str(p)
                .replace("-", "")
                .replace(" ", "")
                .replace("　", "")
                .replace("(", "")
                .replace(")", "")
            )

        phone_norm = normalize_phone(phone)
        mobile_norm = normalize_phone(mobile_phone)

        # --------------------
        # DB側電話も正規化して比較できるように annotate
        # --------------------
        qs = Customer.objects.all().annotate(
            phone_norm_db=Replace(
                Replace(Replace(Replace(Replace(F("phone"), Value("-"), Value("")), Value(" "), Value("")),
                                Value("　"), Value("")), Value("("), Value("")),
                Value(")"), Value("")
            ),
            mobile_norm_db=Replace(
                Replace(Replace(Replace(Replace(F("mobile_phone"), Value("-"), Value("")), Value(" "), Value("")),
                                Value("　"), Value("")), Value("("), Value("")),
                Value(")"), Value("")
            ),
        )

        # --------------------
        # 各一致フラグ（理由出し用）
        # --------------------
        match_email = Case(
            When(email=email, then=Value(True)),
            default=Value(False),
            output_field=BooleanField(),
        ) if email else Value(False, output_field=BooleanField())

        match_phone = Case(
            When(phone_norm_db=phone_norm, then=Value(True)),
            default=Value(False),
            output_field=BooleanField(),
        ) if phone_norm else Value(False, output_field=BooleanField())

        match_mobile = Case(
            When(mobile_norm_db=mobile_norm, then=Value(True)),
            default=Value(False),
            output_field=BooleanField(),
        ) if mobile_norm else Value(False, output_field=BooleanField())

        match_name = Case(
            When(name__icontains=name, then=Value(True)),
            default=Value(False),
            output_field=BooleanField(),
        ) if name else Value(False, output_field=BooleanField())

        match_kana = Case(
            When(kana__icontains=kana, then=Value(True)),
            default=Value(False),
            output_field=BooleanField(),
        ) if kana else Value(False, output_field=BooleanField())

        match_address = Case(
            When(address__icontains=address, then=Value(True)),
            default=Value(False),
            output_field=BooleanField(),
        ) if address else Value(False, output_field=BooleanField())

        qs = qs.annotate(
            match_email=match_email,
            match_phone=match_phone,
            match_mobile=match_mobile,
            match_name=match_name,
            match_kana=match_kana,
            match_address=match_address,
        )

        # --------------------
        # スコア計算（重み付き加算）
        # --------------------
        qs = qs.annotate(
            score=(
                Case(When(match_email=True, then=Value(self.W_EMAIL_EXACT)), default=Value(0), output_field=IntegerField())
                + Case(When(match_phone=True, then=Value(self.W_PHONE_EXACT)), default=Value(0), output_field=IntegerField())
                + Case(When(match_mobile=True, then=Value(self.W_MOBILE_EXACT)), default=Value(0), output_field=IntegerField())
                + Case(When(match_name=True, then=Value(self.W_NAME_PARTIAL)), default=Value(0), output_field=IntegerField())
                + Case(When(match_kana=True, then=Value(self.W_KANA_PARTIAL)), default=Value(0), output_field=IntegerField())
                + Case(When(match_address=True, then=Value(self.W_ADDRESS_PARTIAL)), default=Value(0), output_field=IntegerField())
            )
        )

        # --------------------
        # 候補の抽出条件：どれか1つでも一致してるものだけ
        # （住所だけで大量ヒットが気になるなら、ここを調整）
        # --------------------
        qs = qs.filter(
            Q(match_email=True)
            | Q(match_phone=True)
            | Q(match_mobile=True)
            | Q(match_name=True)
            | Q(match_kana=True)
            | Q(match_address=True)
        )

        # スコア順に上位だけ（必要なら件数変更）
        qs = qs.order_by("-score", "id")[:20]

        candidates = []
        for c in qs:
            reasons = []
            if getattr(c, "match_email", False):
                reasons.append("email一致")
            if getattr(c, "match_phone", False):
                reasons.append("phone一致")
            if getattr(c, "match_mobile", False):
                reasons.append("mobile_phone一致")
            if getattr(c, "match_name", False):
                reasons.append("name部分一致")
            if getattr(c, "match_kana", False):
                reasons.append("kana部分一致")
            if getattr(c, "match_address", False):
                reasons.append("address部分一致")

            candidates.append(
                {
                    "id": c.id,
                    "name": c.name,
                    "kana": getattr(c, "kana", None),
                    "phone": getattr(c, "phone", None),
                    "mobile_phone": getattr(c, "mobile_phone", None),
                    "email": getattr(c, "email", None),
                    "address": getattr(c, "address", None),
                    "score": getattr(c, "score", 0),
                    "reasons": reasons,
                }
            )

        return Response(
            {
                "has_similar": len(candidates) > 0,
                "count": len(candidates),
                "candidates": candidates,
            },
            status=status.HTTP_200_OK,
        )
