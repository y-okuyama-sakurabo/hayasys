from rest_framework import generics
from core.models import Product
from core.serializers.products import ProductSerializer
from utils.text import normalize_japanese


class ProductListAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer

    def get_queryset(self):
        small_id = self.request.query_params.get("small_id")
        keyword = self.request.query_params.get("q")

        qs = Product.objects.filter(is_active=True)

        if small_id:
            qs = qs.filter(category_id=small_id)

        if keyword:
            q = normalize_japanese(keyword)
            qs = qs.filter(name_search__contains=q)

        return qs
