#!/bin/sh
# Libera spazio su VPS 10GB senza toccare i volumi dati (Fontane + Gare).
# Uso: ./scripts/vps-cleanup-disk.sh
set -e

echo "=== Spazio PRIMA ==="
df -h / /var/lib/docker /tmp 2>/dev/null || df -h /

echo ""
echo "→ fermo stack Gare Appalto (se attivo)"
cd "$(dirname "$0")/.." 2>/dev/null || cd /var/www/gare-appalto
docker compose -f docker-compose.yml -f docker-compose.prod.yml down 2>/dev/null || true

echo "→ cache build Docker"
docker builder prune -af 2>/dev/null || true

echo "→ immagini/container/rete non usati (volumi intatti)"
docker system prune -af 2>/dev/null || true

echo "→ log di sistema"
journalctl --vacuum-size=50M 2>/dev/null || true

echo "→ cache apt"
apt-get clean -y 2>/dev/null || true

echo "→ tar temporanei deploy"
rm -f /tmp/gareappalto-*.tar /tmp/fb-*.tar /tmp/gare-*.sh 2>/dev/null || true

echo ""
echo "=== Spazio DOPO ==="
df -h / /var/lib/docker /tmp 2>/dev/null || df -h /
echo ""
docker system df 2>/dev/null || true
echo ""
echo "NON eseguire deploy-vps.sh --build sul VPS 10GB."
echo "Usa dal PC: .\\scripts\\deploy-to-vps.ps1"
