from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager

class Shop(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=120)
    location = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    fax = models.CharField(max_length=20, blank=True)
    email = models.EmailField(max_length=255, blank=True)
    opening_hours = models.CharField(max_length=100, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"{self.code} {self.name}"

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

class User(AbstractUser):
    username = None
    login_id = models.CharField(max_length=50, unique=True)
    display_name = models.CharField("表示名", max_length=100, blank=True, null=True)
    shop = models.ForeignKey("core.Shop", on_delete=models.PROTECT, null=True, blank=True)
    role = models.CharField(max_length=20, default="staff")
    USERNAME_FIELD = "login_id"
    REQUIRED_FIELDS = []
    objects = UserManager()
    def __str__(self):
        return self.login_id
