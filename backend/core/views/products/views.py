from rest_framework import generics
from core.models import ProductCategoryLarge, ProductCategoryMiddle, ProductCategorySmall, Product
from core.serializers.products import *
import unicodedata

class LargeCategoryListAPIView(generics.ListAPIView):
    queryset = ProductCategoryLarge.objects.all()
    serializer_class = ProductCategoryLargeSerializer

class MiddleCategoryListAPIView(generics.ListAPIView):
    serializer_class = ProductCategoryMiddleSerializer
    def get_queryset(self):
        large_id = self.request.query_params.get("large_id")
        qs = ProductCategoryMiddle.objects.all()
        return qs.filter(large_id=large_id) if large_id else qs

class SmallCategoryListAPIView(generics.ListAPIView):
    serializer_class = ProductCategorySmallSerializer
    def get_queryset(self):
        middle_id = self.request.query_params.get("middle_id")
        qs = ProductCategorySmall.objects.all()
        return qs.filter(middle_id=middle_id) if middle_id else qs

class ProductListAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer

    def normalize_text(self, text: str) -> str:
        """
        日本語検索用の正規化処理
        - 全角⇄半角を統一
        - ひらがな→カタカナに統一
        - 英数字も小文字に揃える
        """
        if not text:
            return ""
        # 全角→半角などを統一
        normalized = unicodedata.normalize("NFKC", text)
        # ひらがな → カタカナ
        normalized = "".join(
            chr(ord(ch) + 0x60) if "ぁ" <= ch <= "ん" else ch
            for ch in normalized
        )
        # 英数字を小文字化
        normalized = normalized.lower()
        return normalized

    def get_queryset(self):
        small_id = self.request.query_params.get("small_id")
        keyword = self.request.query_params.get("q")
        qs = Product.objects.filter(is_active=True)

        if small_id:
            qs = qs.filter(small_id=small_id)

        if keyword:
            # 🔍 入力文字列を正規化
            normalized_q = self.normalize_text(keyword)

            # 🔍 DB上のデータも正規化して比較
            # Django ORMのicontainsはPythonレベルの正規化を考慮しないので、
            # あくまで簡易対応としてこれでOK（PostgreSQL拡張を使うなら更に強力化可）
            qs = [
                p for p in qs
                if normalized_q in self.normalize_text(p.name)
            ]

            # Django ORM互換に戻す
            from django.db.models.query import QuerySet
            if not isinstance(qs, QuerySet):
                from django.db.models import Q
                ids = [p.id for p in qs]
                qs = Product.objects.filter(id__in=ids)

        return qs
