#!/bin/sh
# Primo certificato SSL per gare.fontanebianche.today (porta 8080 per ACME webroot).
# Esegui sul VPS dopo aver aperto la porta 8080 e creato il record DNS A.
set -e

DOMAIN="${APP_DOMAIN:-gare.fontanebianche.today}"
REMOTE_PATH="${REMOTE_PATH:-/var/www/gare-appalto}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-gareappalto}"

cd "$REMOTE_PATH"
export COMPOSE_PROJECT_NAME

WEBROOT_VOLUME="${COMPOSE_PROJECT_NAME}_certbot_webroot"
WEBROOT_PATH="/var/lib/docker/volumes/${WEBROOT_VOLUME}/_data"

mkdir -p "$WEBROOT_PATH"

certbot certonly --webroot \
  -w "$WEBROOT_PATH" \
  -d "$DOMAIN" \
  --email "admin@${DOMAIN#*.}" \
  --agree-tos \
  --non-interactive

docker compose -f docker-compose.yml -f docker-compose.prod.yml restart frontend
echo "Certificato ottenuto. Sito HTTPS: https://${DOMAIN}:8443"
