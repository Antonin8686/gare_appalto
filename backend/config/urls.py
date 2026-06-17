from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api/", include("companies.urls")),
    path("api/", include("technical_offers.urls")),
    path("api/", include("tenders.urls")),
    path("api/", include("participations.urls")),
    path("api/", include("rag.urls")),
    path("api/", include("ai.urls")),
    path("api/auth/", include("accounts.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
