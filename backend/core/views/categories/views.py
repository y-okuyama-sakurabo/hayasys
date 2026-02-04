from rest_framework import generics, permissions
from core.models.categories import Category, Product
from core.serializers.categories import CategorySerializer, CategoryTreeSerializer
from core.serializers.products import ProductSerializer


class CategoryListAPIView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        parent_param = self.request.query_params.get("parent")

        # "null" や None, "" の場合 → 親なしカテゴリ
        if parent_param in [None, "", "null", "None"]:
            return Category.objects.filter(parent__isnull=True).order_by("sort_order", "id")

        # 数値が指定された場合 → 該当親の子カテゴリ
        try:
            parent_id = int(parent_param)
            return Category.objects.filter(parent_id=parent_id).order_by("sort_order", "id")
        except (ValueError, TypeError):
            # 不正なID指定時は空のクエリセットを返す
            return Category.objects.none()


class ProductListAPIView(generics.ListAPIView):
    """カテゴリに紐づく商品一覧API"""
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        category_id = self.request.query_params.get("category")
        qs = Product.objects.filter(is_active=True)
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs.order_by("name")
    
class ProductSearchAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        q = self.request.query_params.get("q", "")
        qs = Product.objects.filter(is_active=True)

        if q:
            qs = qs.filter(name__icontains=q)

        return qs.order_by("name")[:20]

class CategoryRetrieveAPIView(generics.RetrieveAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class CategoryTreeAPIView(generics.ListAPIView):
    """
    ルートカテゴリ（parent=None）を起点に、
    子カテゴリを再帰的に含めて返すAPI
    """
    serializer_class = CategoryTreeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Category.objects.filter(parent__isnull=True)
            .prefetch_related(
                "children",
                "children__children",
                "children__children__children",
                "children__children__children__children",
            )
            .order_by("sort_order", "id")
        )
