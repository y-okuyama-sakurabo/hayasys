from django.db import models
from django.core.exceptions import ValidationError
from core.utils.text import normalize_japanese


# ============================================
# メーカーグループ
# ============================================
class ManufacturerGroup(models.Model):

    name = models.CharField("メーカーグループ名", max_length=100, unique=True)
    code = models.CharField("グループコード", max_length=50, unique=True)

    class Meta:
        db_table = "manufacturer_groups"
        ordering = ["name"]

    def __str__(self):
        return self.name


# ============================================
# カテゴリ
# ============================================
class Category(models.Model):

    CATEGORY_TYPE_CHOICES = [
        ("vehicle", "車両"),
        ("item", "商品"),
        ("expense", "費用"),
        ("insurance", "保険"),
        ("other", "その他"),
    ]

    name = models.CharField("カテゴリ名", max_length=100)

    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children"
    )

    category_type = models.CharField(
        max_length=20,
        choices=CATEGORY_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="最上位カテゴリのみ設定"
    )

    TAX_TYPE_CHOICES = [
        ("taxable", "課税"),
        ("non_taxable", "非課税"),
    ]

    tax_type = models.CharField(
        max_length=20,
        choices=TAX_TYPE_CHOICES,
        null=True,
        blank=True,
        db_index=True,
    )

    # 🔥 直付け方式
    manufacturer_group = models.ForeignKey(
        ManufacturerGroup,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="categories"
    )

    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "categories"
        ordering = ["sort_order", "id"]
        unique_together = ("parent", "name")

    def __str__(self):
        return self.full_path

    @property
    def full_path(self):
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name

    def clean(self):
        depth = 0
        parent = self.parent
        while parent:
            depth += 1
            parent = parent.parent

        if depth >= 4:
            raise ValidationError("カテゴリは最大5階層までです。")


# ============================================
# 商品
# ============================================
class Product(models.Model):

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products"
    )

    manufacturer = models.ForeignKey(
        "Manufacturer",
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

    unit_price = models.DecimalField(
        "単価",
        max_digits=10,
        decimal_places=2,
        default=0
    )

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
        self.name_search = normalize_japanese(self.name)

        if self.category and self.category.tax_type:
            if not self.tax_type:
                self.tax_type = self.category.tax_type

                super().save(*args, **kwargs)

# ============================================
# メーカー
# ============================================
class Manufacturer(models.Model):

    name = models.CharField("メーカー名", max_length=100, unique=True)

    # 🔥 ManyToManyに変更
    groups = models.ManyToManyField(
        ManufacturerGroup,
        related_name="manufacturers",
        blank=True,
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturers"
        ordering = ["name"]

    def __str__(self):
        return self.name
