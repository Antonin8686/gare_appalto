from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions import IsOrganizationMember, RBACPermission
from .serializers import (
    CustomTokenObtainPairSerializer,
    OrganizationUserCreateSerializer,
    OrganizationUserUpdateSerializer,
    RolePermissionMatrixSerializer,
    UserSerializer,
    build_permission_matrix_payload,
)

User = get_user_model()


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class MeView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Il refresh token è obbligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response(
                {"detail": "Refresh token non valido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class OrganizationUserListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsOrganizationMember, RBACPermission]
    serializer_class = UserSerializer
    pagination_class = None

    def get_queryset(self):
        return User.objects.filter(
            organization=self.request.user.organization,
        ).order_by("email")


class OrganizationUserCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated, IsOrganizationMember, RBACPermission]
    serializer_class = OrganizationUserCreateSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["organization"] = self.request.user.organization
        return context

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class OrganizationUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsOrganizationMember, RBACPermission]
    serializer_class = UserSerializer
    lookup_url_kwarg = "user_pk"

    def get_queryset(self):
        return User.objects.filter(organization=self.request.user.organization)

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return OrganizationUserUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = OrganizationUserUpdateSerializer(
            instance,
            data=request.data,
            partial=partial,
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(UserSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.id == request.user.id:
            return Response(
                {"detail": "Non puoi eliminare il tuo account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RolePermissionMatrixView(APIView):
    permission_classes = [IsAuthenticated, IsOrganizationMember, RBACPermission]

    def get(self, request):
        payload = build_permission_matrix_payload()
        return Response(RolePermissionMatrixSerializer(payload).data)
