from rest_framework import generics, permissions, status
from rest_framework.response import Response

from core.models.categories import Category, Product
from core.serializers.categories import CategorySerializer, CategoryTreeSerializer
from core.serializers.products import ProductSerializer
from core.utils.text import normalize_japanese

from django.db.models import Q


# ============================================
# カテゴリ一覧
# ============================================
class CategoryListAPIView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = Category.objects.all()

        parent_param = self.request.query_params.get("parent")
        category_type = self.request.query_params.get("type")

        # 🔥 L1カテゴリのみ type フィルタ
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


# ============================================
# 商品一覧 + 作成
# ============================================
class ProductListAPIView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        category_id = self.request.query_params.get("category")
        search = self.request.query_params.get("search")
        category_types = self.request.query_params.getlist("type")

        qs = Product.objects.filter(
            is_active=True
        ).exclude(category__isnull=True)

        if category_id:
            qs = qs.filter(category_id=category_id)

        # 🔥 ここが本質
        if category_types:
            qs = qs.filter(
                Q(category__category_type__in=category_types) |
                Q(category__parent__category_type__in=category_types) |
                Q(category__parent__parent__category_type__in=category_types) |
                Q(category__parent__parent__parent__category_type__in=category_types)
            )

        if search:
            normalized_q = normalize_japanese(search)
            qs = qs.filter(name_search__icontains=normalized_q)

        return qs.order_by("name")

    # 🔥 重複防止 + 正しいレスポンス制御
    def create(self, request, *args, **kwargs):
        name = request.data.get("name")
        category_id = request.data.get("category_id")

        if not name:
            return Response(
                {"error": "name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized = normalize_japanese(name)

        existing = Product.objects.filter(
            name_search=normalized,
            category_id=category_id,
            is_active=True
        ).first()

        # 🔥 既存返す（200）
        if existing:
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # 🔥 新規作成（201）
        return super().create(request, *args, **kwargs)


# ============================================
# 商品サジェスト検索
# ============================================
class ProductSearchAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        category_id = self.request.query_params.get("category")
        search = self.request.query_params.get("search")
        category_types = self.request.query_params.getlist("type")  # ←追加

        qs = Product.objects.filter(
            is_active=True
        ).exclude(category__isnull=True)

        # 🔥 typeフィルター（最優先）
        if category_types:
            qs = qs.filter(category__category_type__in=category_types)

        # カテゴリ
        if category_id:
            qs = qs.filter(category_id=category_id)

        # 検索
        if search:
            normalized_q = normalize_japanese(search)
            qs = qs.filter(name_search__icontains=normalized_q)

        return qs.order_by("name")


# ============================================
# カテゴリ単体取得
# ============================================
class CategoryRetrieveAPIView(generics.RetrieveAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]


# ============================================
# カテゴリツリー
# ============================================
class CategoryTreeAPIView(generics.ListAPIView):
    serializer_class = CategoryTreeSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None 

    def get_queryset(self):
        qs = Category.objects.filter(parent__isnull=True)

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


# ============================================
# 末端カテゴリ一覧
# ============================================
class LeafCategoryListAPIView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Category.objects.filter(children__isnull=True)

        category_type = self.request.query_params.get("type")
        if category_type:
            qs = qs.filter(category_type=category_type)

        return qs.order_by("sort_order", "id")
    
