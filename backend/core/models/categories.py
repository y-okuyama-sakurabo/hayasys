from django.db import models
from core.utils.text import normalize_japanese


class Category(models.Model):
    """柔軟なカテゴリ（最大5階層対応）"""
    name = models.CharField("カテゴリ名", max_length=100)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children"
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "categories"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.full_path

    @property
    def full_path(self):
        """親カテゴリまでのパスを返す"""
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name


class Product(models.Model):
    """商品（商品名は手入力。カテゴリだけ選択）"""
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products"
    )
    name = models.CharField("商品名", max_length=200)

    name_search = models.CharField(
        "検索用商品名",
        max_length=300,
        editable=False,
        db_index=True
    )

    unit_price = models.DecimalField("単価", max_digits=10, decimal_places=2, default=0)
    tax_type = models.CharField(
        "課税区分",
        max_length=20,
        choices=[("taxable", "課税"), ("non_taxable", "非課税")],
        default="taxable"
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "products"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.category.full_path if self.category else 'カテゴリ未設定'})"

    def save(self, *args, **kwargs):
        # 🔽 商品名を正規化して検索用フィールドに保存
        self.name_search = normalize_japanese(self.name)
        super().save(*args, **kwargs)
