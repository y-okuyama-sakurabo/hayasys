from rest_framework import serializers
from core.models.categories import Category


class CategorySerializer(serializers.ModelSerializer):
    """カテゴリ（親方向にもネスト）"""
    parent = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "parent"]

    def get_parent(self, obj):
        """親カテゴリを再帰的に返す（Noneまで遡る）"""
        if obj.parent:
            return CategorySerializer(obj.parent).data
        return None

class CategoryTreeSerializer(serializers.ModelSerializer):
    """子階層を再帰的にネストして返す（ツリー構造用）"""
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "children"]

    def get_children(self, obj):
        children = obj.children.all().order_by("id")
        if children.exists():
            return CategoryTreeSerializer(children, many=True).data
        return []
    
class CategoryBreadcrumbSerializer(serializers.ModelSerializer):
    parent = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "parent"]

    def get_parent(self, obj):
        if obj.parent:
            return CategoryBreadcrumbSerializer(obj.parent).data
        return None