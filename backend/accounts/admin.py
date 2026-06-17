from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Organization, User


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "created_at")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "username", "first_name", "last_name", "organization", "role", "is_staff")
    list_filter = ("role", "is_staff", "is_superuser", "is_active", "organization")
    search_fields = ("email", "username", "first_name", "last_name", "organization__name")
    ordering = ("email",)

    fieldsets = BaseUserAdmin.fieldsets + (
        ("Profilo", {"fields": ("organization", "role")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Profilo", {"fields": ("email", "organization", "role")}),
    )
