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


# ============================================
# 管理画面用シリアライザ
# ============================================

class CategoryAdminSerializer(serializers.ModelSerializer):
    """管理画面用ツリー — 全フィールド + 子を再帰的にネスト"""
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id", "name", "parent_id",
            "category_type", "tax_type", "sort_order",
            "children",
        ]

    def get_children(self, obj):
        children = obj.children.all().order_by("sort_order", "id")
        return CategoryAdminSerializer(children, many=True).data


class CategoryWriteSerializer(serializers.ModelSerializer):
    """カテゴリ作成・更新用"""

    class Meta:
        model = Category
        fields = ["id", "name", "parent", "category_type", "tax_type", "sort_order"]

    def validate(self, data):
        # 深さチェック
        parent = data.get("parent", getattr(self.instance, "parent", None))
        if parent:
            depth = 0
            p = parent
            while p:
                depth += 1
                p = p.parent
            if depth >= 4:
                raise serializers.ValidationError(
                    {"parent": "カテゴリは最大5階層までです。"}
                )

        # 同一親 + 同一名重複チェック（更新時は自身を除外）
        name = data.get("name", getattr(self.instance, "name", None))
        qs = Category.objects.filter(parent=parent, name=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {"name": "同じ親カテゴリに同じ名前のカテゴリが存在します。"}
            )

        return data