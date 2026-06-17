from django.urls import path

from .views import (
    RagContextualSearchView,
    RagReindexView,
    RagRetrieveSourcesView,
    RagSearchView,
)

urlpatterns = [
    path("rag/search/", RagSearchView.as_view(), name="rag-search"),
    path("rag/search/contextual/", RagContextualSearchView.as_view(), name="rag-contextual-search"),
    path("rag/sources/", RagRetrieveSourcesView.as_view(), name="rag-retrieve-sources"),
    path("rag/reindex/", RagReindexView.as_view(), name="rag-reindex"),
]
