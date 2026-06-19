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
        # filter() は prefetch キャッシュを無効化するので Python でフィルタ
        children = sorted(
            (c for c in obj.children.all() if not c.is_deleted),
            key=lambda c: (c.sort_order, c.id),
        )
        return CategoryAdminSerializer(children, many=True).data


class CategoryTrashSerializer(serializers.ModelSerializer):
    """論理削除済みカテゴリ一覧用"""
    class Meta:
        model = Category
        fields = ["id", "name", "parent_id", "category_type", "tax_type", "deleted_at"]


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

        # 同一親 + 同一名 + 同一category_type の重複チェック（更新時は自身を除外）
        name = data.get("name", getattr(self.instance, "name", None))
        category_type = data.get("category_type", getattr(self.instance, "category_type", None))
        qs = Category.objects.filter(
            parent=parent, name=name, category_type=category_type, is_deleted=False
        )
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {"name": "同じ親カテゴリに同じ名前・種別のカテゴリが存在します。"}
            )

        return data