from rest_framework import generics, permissions
from core.models.categories import Category, Product
from core.serializers.categories import CategorySerializer, CategoryTreeSerializer
from core.serializers.products import ProductSerializer
from core.utils.text import normalize_japanese
from django.db.models import Q



from django.db.models import Q

class CategoryListAPIView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Category.objects.all()

        parent_param = self.request.query_params.get("parent")
        category_type = self.request.query_params.get("type")

        # 🔥 category_type で絞る（L1にだけ効く）
        if category_type:
            qs = qs.filter(category_type=category_type)

        # parent処理
        if parent_param in [None, "", "null", "None"]:
            qs = qs.filter(parent__isnull=True)
        else:
            try:
                parent_id = int(parent_param)
                qs = qs.filter(parent_id=parent_id)
            except (ValueError, TypeError):
                return Category.objects.none()

        return qs.order_by("sort_order", "id")


class ProductListAPIView(generics.ListCreateAPIView):
    """
    商品一覧 + 商品作成API
    GET  → 一覧
    POST → 作成
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        category_id = self.request.query_params.get("category")
        search = self.request.query_params.get("search")

        qs = Product.objects.filter(is_active=True)

        if category_id:
            qs = qs.filter(category_id=category_id)

        if search:
            normalized_q = normalize_japanese(search)
            qs = qs.filter(name_search__contains=normalized_q)

        return qs.order_by("name")

    def perform_create(self, serializer):
        serializer.save()

    
class ProductSearchAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        q = self.request.query_params.get("q", "")
        qs = Product.objects.filter(is_active=True)

        if q:
            normalized_q = normalize_japanese(q)
            qs = qs.filter(name_search__contains=normalized_q)

        return qs.order_by("name")[:20]

class CategoryRetrieveAPIView(generics.RetrieveAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class CategoryTreeAPIView(generics.ListAPIView):
    serializer_class = CategoryTreeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Category.objects.filter(parent__isnull=True)

        # 🔥 ここが重要
        category_types = self.request.query_params.getlist("type")

        if category_types:
            qs = qs.filter(category_type__in=category_types)

        return (
            qs.prefetch_related(
                "children",
                "children__children",
                "children__children__children",
                "children__children__children__children",
            )
            .order_by("sort_order", "id")
        )

    
class LeafCategoryListAPIView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Category.objects.filter(children__isnull=True)

        # type フィルタ対応（車両・保険など）
        category_type = self.request.query_params.get("type")
        if category_type:
            qs = qs.filter(category_type=category_type)

        return qs.order_by("sort_order", "id")

