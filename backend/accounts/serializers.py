from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .rbac import (
    PERMISSION_GROUPS,
    PERMISSION_LABELS,
    ROLE_PERMISSIONS,
    Role,
    get_user_permissions,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    organization_id = serializers.IntegerField(source="organization.id", read_only=True, allow_null=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True, allow_null=True)
    role_label = serializers.CharField(source="get_role_display", read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "organization_id",
            "organization_name",
            "role",
            "role_label",
            "permissions",
            "is_active",
            "date_joined",
        )
        read_only_fields = (
            "id",
            "organization_id",
            "organization_name",
            "role_label",
            "permissions",
            "date_joined",
        )

    def get_permissions(self, obj) -> list[str]:
        return get_user_permissions(obj)


class OrganizationUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = (
            "email",
            "username",
            "password",
            "first_name",
            "last_name",
            "role",
            "is_active",
        )

    def validate_role(self, value):
        if value not in dict(Role.CHOICES):
            raise serializers.ValidationError("Ruolo non valido.")
        return value

    def create(self, validated_data):
        organization = self.context["organization"]
        return User.objects.create_user(organization=organization, **validated_data)


class OrganizationUserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("email", "username", "first_name", "last_name", "role", "is_active", "password")

    def validate_password(self, value):
        if value:
            validate_password(value)
        return value

    def validate_email(self, value):
        queryset = User.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Email già in uso.")
        return value

    def validate_username(self, value):
        queryset = User.objects.filter(username__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Username già in uso.")
        return value

    def validate_role(self, value):
        if value not in dict(Role.CHOICES):
            raise serializers.ValidationError("Ruolo non valido.")
        return value

    def validate(self, attrs):
        user = self.instance
        request = self.context.get("request")
        if (
            user
            and request
            and user.id == request.user.id
            and "role" in attrs
            and attrs["role"] != user.role
        ):
            raise serializers.ValidationError(
                {"role": "Non puoi modificare il tuo ruolo."}
            )
        if (
            user
            and request
            and user.id == request.user.id
            and attrs.get("is_active") is False
        ):
            raise serializers.ValidationError(
                {"is_active": "Non puoi disattivare il tuo account."}
            )
        return attrs

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        return user


class RolePermissionMatrixSerializer(serializers.Serializer):
    roles = serializers.ListField()
    permission_groups = serializers.DictField()
    permission_labels = serializers.DictField()
    role_permissions = serializers.DictField()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        if user.organization_id:
            token["organization_id"] = user.organization_id
        token["role"] = getattr(user, "role", Role.COMPANY_USER)
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


def build_permission_matrix_payload() -> dict:
    roles = [
        {"id": role_id, "label": label}
        for role_id, label in Role.CHOICES
    ]
    grouped_labels = {
        group: {perm: PERMISSION_LABELS.get(perm, perm) for perm in perms}
        for group, perms in PERMISSION_GROUPS.items()
    }
    role_permissions = {
        role_id: sorted(perms)
        for role_id, perms in ROLE_PERMISSIONS.items()
    }
    return {
        "roles": roles,
        "permission_groups": grouped_labels,
        "permission_labels": PERMISSION_LABELS,
        "role_permissions": role_permissions,
    }
