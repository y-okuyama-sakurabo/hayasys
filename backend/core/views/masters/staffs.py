import csv
import io

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.http import HttpResponse

from core.models.base import ROLE_CHOICES, GLOBAL_ROLES
from core.models import Shop
from core.serializers.masters import StaffSerializer

User = get_user_model()

# 管理操作を許可するロール
MANAGER_ROLES = {"executive", "manager", "store_manager", "admin"}


def _is_manager(user):
    return user.is_superuser or getattr(user, "role", "") in MANAGER_ROLES


class StaffListView(APIView):
    """
    スタッフ一覧 + スタッフ登録
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            User.objects.filter(is_active=True)
            .select_related("shop")
            .order_by("id")
        )
        serializer = StaffSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not _is_manager(request.user):
            return Response(
                {"detail": "スタッフの追加は管理者のみ可能です。"},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = StaffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        staff = serializer.save()
        return Response(StaffSerializer(staff).data, status=status.HTTP_201_CREATED)


class StaffDetailView(APIView):
    """
    スタッフ詳細 / 編集 / 削除（論理削除）
    """
    permission_classes = [IsAuthenticated]

    def _get_object(self, pk):
        try:
            return User.objects.select_related("shop").get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get_object(pk)
        if not obj:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(StaffSerializer(obj).data)

    def patch(self, request, pk):
        if not _is_manager(request.user):
            return Response({"detail": "権限がありません。"}, status=status.HTTP_403_FORBIDDEN)
        obj = self._get_object(pk)
        if not obj:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = StaffSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        staff = serializer.save()
        return Response(StaffSerializer(staff).data)

    def delete(self, request, pk):
        if not _is_manager(request.user):
            return Response({"detail": "権限がありません。"}, status=status.HTTP_403_FORBIDDEN)
        obj = self._get_object(pk)
        if not obj:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        # 自分自身は削除不可
        if obj.pk == request.user.pk:
            return Response({"detail": "自分自身は削除できません。"}, status=status.HTTP_400_BAD_REQUEST)
        obj.is_active = False
        obj.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class StaffCSVExportView(APIView):
    """
    スタッフ一覧を CSV でダウンロード
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_manager(request.user):
            return Response({"detail": "権限がありません。"}, status=status.HTTP_403_FORBIDDEN)

        qs = (
            User.objects.filter(is_active=True)
            .select_related("shop")
            .order_by("id")
        )

        role_map = dict(ROLE_CHOICES)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "display_name", "login_id", "shop_code", "shop_name", "role", "role_display"])

        for u in qs:
            writer.writerow([
                u.id,
                u.display_name or "",
                u.login_id,
                u.shop.code if u.shop else "",
                u.shop.name if u.shop else "",
                u.role,
                role_map.get(u.role, u.role),
            ])

        response = HttpResponse(
            "﻿" + output.getvalue(),  # BOM付きUTF-8（Excelで開けるように）
            content_type="text/csv; charset=utf-8",
        )
        response["Content-Disposition"] = 'attachment; filename="staffs.csv"'
        return response


class StaffCSVImportView(APIView):
    """
    CSV ファイルからスタッフを一括登録 / 更新
    ヘッダ行: display_name, login_id, shop_code, role, password（任意）
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _is_manager(request.user):
            return Response({"detail": "権限がありません。"}, status=status.HTTP_403_FORBIDDEN)

        csv_file = request.FILES.get("file")
        if not csv_file:
            return Response({"detail": "ファイルがありません。"}, status=status.HTTP_400_BAD_REQUEST)

        # BOM除去してデコード
        raw = csv_file.read()
        text = raw.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))

        # 店舗コードキャッシュ
        shop_cache = {s.code: s for s in Shop.objects.all()}
        valid_roles = {r[0] for r in ROLE_CHOICES}

        created = 0
        updated = 0
        errors  = []

        for i, row in enumerate(reader, start=2):  # 2行目からデータ
            login_id     = (row.get("login_id") or "").strip()
            display_name = (row.get("display_name") or "").strip()
            shop_code    = (row.get("shop_code") or "").strip()
            role         = (row.get("role") or "staff").strip()
            password     = (row.get("password") or "").strip()

            if not login_id or not display_name:
                errors.append(f"行{i}: display_name または login_id が空です")
                continue

            if role not in valid_roles:
                errors.append(f"行{i}: role '{role}' は無効です")
                continue

            shop = shop_cache.get(shop_code) if shop_code else None

            try:
                user, is_new = User.objects.get_or_create(
                    login_id=login_id,
                    defaults={
                        "display_name": display_name,
                        "shop": shop,
                        "role": role,
                        "is_active": True,
                    },
                )
                if is_new:
                    user.set_password(password or "password123")
                    user.save()
                    created += 1
                else:
                    # 既存レコードは更新
                    user.display_name = display_name
                    user.shop = shop
                    user.role = role
                    user.is_active = True
                    if password:
                        user.set_password(password)
                    user.save()
                    updated += 1
            except Exception as e:
                errors.append(f"行{i}: {str(e)}")

        return Response({
            "created": created,
            "updated": updated,
            "errors":  errors,
        })
