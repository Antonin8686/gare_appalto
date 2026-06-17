#!/bin/sh
set -e

DOMAIN="${APP_DOMAIN:-gare.fontanebianche.today}"
CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
OUT="/etc/nginx/conf.d/default.conf"

rm -f /etc/nginx/conf.d/default.conf

if [ -f "$CERT" ] && [ -f "$KEY" ]; then
  echo "SSL: certificato trovato per ${DOMAIN}, abilito HTTPS sulla porta 443 del container (8443 sul host)"
  cat /etc/nginx/templates/nginx.prod.http-redirect.conf /etc/nginx/templates/nginx.prod.ssl.conf > "$OUT"
else
  echo "SSL: certificato assente per ${DOMAIN}, sito su HTTP (porta 8080 sul host)"
  cp /etc/nginx/templates/nginx.prod.http-serve.conf "$OUT"
fi

nginx -t
exec nginx -g 'daemon off;'
