#!/bin/sh
set -e
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

if [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; then
  echo "Uso: ADMIN_EMAIL=admin@esempio.it ADMIN_PASSWORD='password-sicura' ./scripts/create-admin.sh"
  exit 1
fi

$COMPOSE exec -T \
  -e "ADMIN_EMAIL=${ADMIN_EMAIL}" \
  -e "ADMIN_PASSWORD=${ADMIN_PASSWORD}" \
  -e "ADMIN_ORG=${ADMIN_ORG:-Organizzazione principale}" \
  backend python manage.py create_initial_admin
