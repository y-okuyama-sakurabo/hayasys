from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager

class Shop(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=120)
    postal_code = models.CharField(max_length=10, blank=True)
    location = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    fax = models.CharField(max_length=20, blank=True)
    email = models.EmailField(max_length=255, blank=True)
    opening_hours = models.CharField(max_length=100, blank=True)
    closing_day = models.CharField(max_length=100, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"{self.code} {self.name}"

class CompanySettings(models.Model):
    """会社全体の設定（シングルトン）"""
    registration_number = models.CharField("適格請求書登録番号", max_length=20, blank=True)

    class Meta:
        verbose_name = "会社設定"

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "会社設定"


class UserManager(BaseUserManager):
    use_in_migrations = True
    def create_user(self, login_id, password=None, **extra_fields):
        if not login_id:
            raise ValueError("The login_id must be set")
        user = self.model(login_id=login_id, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    def create_superuser(self, login_id, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        return self.create_user(login_id, password, **extra_fields)

ROLE_CHOICES = [
    ("executive",     "役員"),
    ("accounting",    "経理総務"),
    ("manager",       "MGR・SV"),
    ("store_manager", "店長"),
    ("staff",         "スタッフ"),
    # 旧値（後方互換）
    ("admin",         "管理者(旧)"),
]

# 店舗に属さずに全店舗を閲覧できるロール
GLOBAL_ROLES = {"executive", "accounting", "admin"}

# 役割ごとの表示グループ（店舗欄に出す文字列）
ROLE_GROUP_DISPLAY = {
    "executive":  "未所属",
    "accounting": "経理総務",
    "admin":      "管理者(旧)",
}


class User(AbstractUser):
    username = None
    login_id = models.CharField(max_length=50, unique=True)
    display_name = models.CharField("表示名", max_length=100, blank=True, null=True)
    shop = models.ForeignKey("core.Shop", on_delete=models.PROTECT, null=True, blank=True)
    role = models.CharField(max_length=20, default="staff", choices=ROLE_CHOICES)
    USERNAME_FIELD = "login_id"
    REQUIRED_FIELDS = []
    objects = UserManager()
    def __str__(self):
        return self.login_id
