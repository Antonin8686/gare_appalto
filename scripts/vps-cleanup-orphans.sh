#!/bin/sh
# Pulizia sicura VPS — NON tocca volumi/dati Fontane Bianche.
# Uso: sh scripts/vps-cleanup-orphans.sh
#      sh scripts/vps-cleanup-orphans.sh --remove-swap   (solo se RAM >= 512 MB libera)
set -e

REMOVE_SWAP=0
if [ "$1" = "--remove-swap" ]; then
  REMOVE_SWAP=1
fi

show() {
  echo ""
  echo "=== $1 ==="
  df -h / 2>/dev/null | tail -1
  free -h 2>/dev/null | head -2 || true
}

show "PRIMA"

echo ""
echo "-> immagini Docker non usate (pgvector, minio, ecc.)"
docker image prune -af 2>/dev/null || true

echo ""
echo "-> volumi Docker orfani (fontanebianchetoday_* intatti)"
docker volume prune -f 2>/dev/null || true

echo ""
echo "-> cache apt"
apt-get clean -y 2>/dev/null || true

echo ""
echo "-> log di sistema (max 50MB)"
journalctl --vacuum-size=50M 2>/dev/null || true

echo ""
echo "-> tar temporanei deploy"
rm -f /tmp/fb-*.tar /tmp/gareappalto-*.tar /tmp/gare-*.sh 2>/dev/null || true

if [ "$REMOVE_SWAP" = "1" ] && [ -f /swapfile ]; then
  mem_avail_kb=$(grep MemAvailable /proc/meminfo 2>/dev/null | awk '{print $2}')
  mem_avail_mb=$((mem_avail_kb / 1024))
  echo ""
  echo "-> valuto rimozione swap (RAM disponibile: ${mem_avail_mb} MB)"
  if [ "$mem_avail_mb" -ge 512 ] 2>/dev/null; then
    echo "   swapoff + rimuovo /swapfile (~2 GB)"
    swapoff /swapfile 2>/dev/null || true
    rm -f /swapfile
  else
    echo "   SALTATO: RAM insufficiente (servono almeno 512 MB liberi)"
  fi
fi

echo ""
echo "-> stack Fontane (deve essere Up)"
docker ps --filter "name=fontanebianchetoday" --format 'table {{.Names}}\t{{.Status}}' 2>/dev/null || true

show "DOPO"
echo ""
echo "Fatto. postgres_data e media_data non toccati."
