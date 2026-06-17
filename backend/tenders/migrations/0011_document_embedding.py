import pgvector.django
from django.db import migrations, models
from pgvector.django import HnswIndex, VectorExtension


class Migration(migrations.Migration):
    dependencies = [
        ("tenders", "0010_tender_fase"),
    ]

    operations = [
        VectorExtension(),
        migrations.AddField(
            model_name="document",
            name="embedding",
            field=pgvector.django.VectorField(
                blank=True,
                dimensions=384,
                null=True,
                verbose_name="embedding",
            ),
        ),
        migrations.AddIndex(
            model_name="document",
            index=HnswIndex(
                ef_construction=64,
                fields=["embedding"],
                m=16,
                name="document_embedding_hnsw_idx",
                opclasses=["vector_cosine_ops"],
            ),
        ),
    ]
