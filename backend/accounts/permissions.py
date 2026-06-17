from rest_framework.permissions import BasePermission

from .rbac import get_required_permission, user_has_permission


class IsOrganizationMember(BasePermission):
    message = "Utente non associato a un'organizzazione."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return bool(user.organization_id)


class RBACPermission(BasePermission):
    message = "Non hai i permessi per eseguire questa operazione."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True

        required = get_required_permission(view, request.method)
        if not required:
            return True
        return user_has_permission(user, required)
