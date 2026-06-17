from django.shortcuts import get_object_or_404


def get_user_organization(user):
    if user.organization_id is None:
        raise ValueError("L'utente non appartiene a nessuna organizzazione.")
    return user.organization


def filter_by_organization(queryset, user, field: str = "organization"):
    return queryset.filter(**{field: user.organization_id})


def get_organization_object_or_404(model, user, **lookup):
    return get_object_or_404(model, organization=user.organization_id, **lookup)
