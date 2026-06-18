#!/bin/sh
set -e

DOMAIN="${APP_DOMAIN:-localhost}"
VPS_IP="${VPS_IP:-localhost}"
CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
OUT="/etc/nginx/conf.d/default.conf"
TMP="/tmp/nginx-gare"

mkdir -p "$TMP"
rm -f "$TMP"/*.conf

render() {
  src="$1"
  dest="$2"
  sed "s/__APP_DOMAIN__/${DOMAIN}/g; s/__VPS_IP__/${VPS_IP}/g" "$src" > "$dest"
}

rm -f /etc/nginx/conf.d/default.conf

if [ -f "$CERT" ] && [ -f "$KEY" ]; then
  echo "SSL: certificato trovato per ${DOMAIN}, HTTPS attivo"
  render /etc/nginx/templates/nginx.prod.http-redirect.conf "$TMP/redirect.conf"
  render /etc/nginx/templates/nginx.prod.ssl.conf "$TMP/ssl.conf"
  cat "$TMP/redirect.conf" "$TMP/ssl.conf" > "$OUT"
else
  echo "SSL: certificato assente per ${DOMAIN}, sito su HTTP"
  render /etc/nginx/templates/nginx.prod.http-serve.conf "$OUT"
fi

nginx -t
exec nginx -g 'daemon off;'
