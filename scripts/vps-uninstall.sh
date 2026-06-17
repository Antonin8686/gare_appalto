#!/bin/sh
# Rimuove completamente Gare Appalto dal VPS (non tocca Fontane Bianche).
set -e

REMOTE_PATH="${REMOTE_PATH:-/var/www/gare-appalto}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-gareappalto}"

echo "=== Rimozione Gare Appalto dal VPS ==="

if [ -d "$REMOTE_PATH" ]; then
  cd "$REMOTE_PATH"
  docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v --remove-orphans 2>/dev/null || true
fi

echo "→ container gareappalto"
docker ps -aq --filter "name=${COMPOSE_PROJECT_NAME}" | xargs -r docker rm -f 2>/dev/null || true

echo "→ immagini gareappalto"
docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep '^gareappalto' | awk '{print $2}' | xargs -r docker rmi -f 2>/dev/null || true

echo "→ volumi gareappalto"
docker volume ls --format '{{.Name}}' | grep '^gareappalto' | xargs -r docker volume rm 2>/dev/null || true

echo "→ reti gareappalto"
docker network ls --format '{{.Name}}' | grep '^gareappalto' | xargs -r docker network rm 2>/dev/null || true

echo "→ file temporanei"
rm -f /tmp/gareappalto-*.tar /tmp/gare-*.sh 2>/dev/null || true

echo "→ cartella progetto"
rm -rf "$REMOTE_PATH"

echo "→ cache build Docker (solo layer non usati)"
docker builder prune -af 2>/dev/null || true

echo ""
echo "=== Spazio liberato ==="
df -h /
docker system df 2>/dev/null || true
echo ""
echo "Fontane Bianche non è stato toccato (/var/www/fontanebianchetoday)."
