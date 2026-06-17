from django.urls import path
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    LogoutView,
    MeView,
    OrganizationUserCreateView,
    OrganizationUserDetailView,
    OrganizationUserListView,
    RolePermissionMatrixView,
)


class PublicTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

urlpatterns = [
    path("token/", LoginView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", PublicTokenRefreshView.as_view(), name="token_refresh"),
    path("token/logout/", LogoutView.as_view(), name="token_logout"),
    path("me/", MeView.as_view(), name="me"),
    path("users/", OrganizationUserListView.as_view(), name="organization-users"),
    path("users/create/", OrganizationUserCreateView.as_view(), name="organization-user-create"),
    path("users/<int:user_pk>/", OrganizationUserDetailView.as_view(), name="organization-user-detail"),
    path("rbac/matrix/", RolePermissionMatrixView.as_view(), name="rbac-matrix"),
]
