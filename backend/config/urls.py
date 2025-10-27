from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),

    # Template UI
    path("", include("web.urls")),

    # API (DRF)
    path("api/", include("core.urls_api")),
]

# --- 開発環境のみ /media/ をDjangoで配信する ---
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
