#!/bin/sh
set -e

REMOTE_PATH="${REMOTE_PATH:-/var/www/gare-appalto}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-gareappalto}"

cd "$REMOTE_PATH"
export COMPOSE_PROJECT_NAME

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
if [ -f docker-compose.prod.dedicated.yml ]; then
  COMPOSE="$COMPOSE -f docker-compose.prod.dedicated.yml"
fi

echo "→ avvio celery_worker"
if $COMPOSE config --services 2>/dev/null | grep -qx celery_worker; then
  if grep -q 'profiles:.*celery' docker-compose.prod.yml 2>/dev/null; then
    $COMPOSE --profile celery up -d celery_worker
  else
    $COMPOSE up -d celery_worker
  fi
else
  echo "Servizio celery_worker non trovato nel compose."
  exit 1
fi

sleep 8

echo "→ riaccodo import in elaborazione"
$COMPOSE exec -T backend python manage.py shell <<'PY'
from tenders.models import ImportBatch
from tenders.tasks import process_import_batch

ids = list(ImportBatch.objects.filter(status="processing").values_list("id", flat=True))
print("pending batches:", ids)
for batch_id in ids:
    process_import_batch.delay(batch_id)
PY

echo "Fatto."
