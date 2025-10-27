from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import LoginForm


# ------------------------
# 認証系
# ------------------------
def login_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    form = LoginForm(request, data=request.POST or None)
    if request.method == "POST" and form.is_valid():
        login(request, form.get_user())
        return redirect("dashboard")

    return render(request, "web/login.html", {"form": form})


def logout_view(request):
    logout(request)
    return redirect("login")


@login_required
def dashboard(request):
    return render(request, "web/dashboard.html")


# ------------------------
# 顧客一覧・検索
# ------------------------
@login_required
def customer_list(request):
    # DBアクセスはやめて、JS 側で /api/customers/ を叩く
    return render(request, "web/customers/list.html")


# ------------------------
# 顧客作成
# ------------------------
@login_required
def customer_create(request):
    # DBアクセスはやめて、JS 側で /api/customers/ (POST) を叩く
    return render(request, "web/customers/form.html")


# ------------------------
# 顧客詳細
# ------------------------
@login_required
def customer_detail(request, pk: int):
    # JS 側で /api/customers/{pk}/ を叩く
    return render(request, "web/customers/detail.html", {"pk": pk})


# ------------------------
# 顧客編集
# ------------------------
@login_required
def customer_edit(request, pk: int):
    # JS 側で /api/customers/{pk}/ (PATCH/PUT) を叩く
    return render(request, "web/customers/edit.html", {"pk": pk})

# ------------------------
# 車両詳細
# ------------------------
@login_required
def vehicle_detail(request, pk: int):
    # JS 側で /api/customers/{pk}/ を叩く
    return render(request, "web/vehicles/detail.html", {"pk": pk})

