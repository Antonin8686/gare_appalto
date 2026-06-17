#!/bin/sh
# Deploy su VPS Ionos (dalla cartella /var/www/gare-appalto)
# ATTENZIONE VPS 10GB: non buildare qui. Usa deploy-to-vps.ps1 dal PC.
set -e
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

if [ ! -f backend/.env ]; then
  echo "Manca backend/.env — esegui prima: ./scripts/init-production-env.sh"
  exit 1
fi

if [ ! -f .env ]; then
  echo "Manca .env nella root — esegui: ./scripts/init-production-env.sh"
  exit 1
fi

AVAIL_KB=$(df -k / | awk 'NR==2 {print $4}')
if [ "$AVAIL_KB" -lt 3145728 ]; then
  echo "ERRORE: meno di 3 GB liberi su /. Esegui ./scripts/vps-cleanup-disk.sh"
  echo "Poi deploya dal PC con: .\\scripts\\deploy-to-vps.ps1 (build locale, no build sul VPS)"
  exit 1
fi

chmod +x backend/entrypoint.sh frontend/docker-entrypoint.prod.sh scripts/*.sh

$COMPOSE up -d --build

echo "Attendo avvio servizi..."
sleep 20
$COMPOSE ps

echo ""
echo "Migrazioni database..."
$COMPOSE exec -T backend python manage.py migrate --noinput

echo ""
HTTP_PORT="${FRONTEND_HTTP_PORT:-8080}"
HTTPS_PORT="${FRONTEND_HTTPS_PORT:-8443}"
DOMAIN="${APP_DOMAIN:-gare.fontanebianche.today}"
echo "Sito HTTP:  http://${DOMAIN}:${HTTP_PORT}"
echo "Sito HTTPS: https://${DOMAIN}:${HTTPS_PORT} (dopo certificato SSL)"
echo "Admin API:  http://${DOMAIN}:${HTTP_PORT}/admin/"
echo ""
echo "Crea l'amministratore:"
echo "  ADMIN_EMAIL=tuo@email.it ADMIN_PASSWORD='...' ./scripts/create-admin.sh"
