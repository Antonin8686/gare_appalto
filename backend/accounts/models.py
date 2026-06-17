from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.text import slugify

from .rbac import Role


class Organization(models.Model):
    name = models.CharField("nome", max_length=255, unique=True)
    slug = models.SlugField("slug", max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "organizzazione"
        verbose_name_plural = "organizzazioni"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or "org"
            slug = base_slug
            counter = 1
            while Organization.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @classmethod
    def get_or_create_by_name(cls, name: str) -> tuple["Organization", bool]:
        cleaned = name.strip()
        if not cleaned:
            cleaned = "Organizzazione"
        slug = slugify(cleaned) or "org"
        organization, created = cls.objects.get_or_create(
            slug=slug,
            defaults={"name": cleaned},
        )
        return organization, created


class User(AbstractUser):
    email = models.EmailField("email", unique=True)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.PROTECT,
        related_name="users",
        verbose_name="organizzazione",
        null=True,
        blank=True,
    )
    role = models.CharField(
        "ruolo",
        max_length=32,
        choices=Role.CHOICES,
        default=Role.COMPANY_USER,
        db_index=True,
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    class Meta:
        verbose_name = "utente"
        verbose_name_plural = "utenti"

    def __str__(self):
        return self.email
