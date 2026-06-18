#!/bin/sh
# Genera .env (root) e backend/.env con segreti reali per il VPS.
# Uso: ./scripts/init-production-env.sh
set -e

cd "$(dirname "$0")/.."

if [ -f backend/.env ] && [ "${FORCE:-0}" != "1" ]; then
  echo "backend/.env esiste già. Usa FORCE=1 per rigenerare."
  exit 1
fi

SECRET_KEY=$(openssl rand -base64 48 | tr -d '\n/+=' | head -c 64)
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '\n/+=' | head -c 32)
MINIO_ROOT_USER="gareminio"
MINIO_ROOT_PASSWORD=$(openssl rand -base64 24 | tr -d '\n/+=' | head -c 32)

APP_DOMAIN="${APP_DOMAIN:-localhost}"
VPS_IP="${VPS_IP:-127.0.0.1}"

if [ "${DEDICATED_VPS:-0}" = "1" ]; then
  FRONTEND_HTTP_PORT=80
  FRONTEND_HTTPS_PORT=443
  CORS_ORIGINS="https://${APP_DOMAIN},http://${APP_DOMAIN},http://${VPS_IP}"
  CSRF_ORIGINS="https://${APP_DOMAIN}"
else
  FRONTEND_HTTP_PORT=8080
  FRONTEND_HTTPS_PORT=8443
  CORS_ORIGINS="https://${APP_DOMAIN},http://${APP_DOMAIN},http://${VPS_IP}:8080,https://${APP_DOMAIN}:8443"
  CSRF_ORIGINS="https://${APP_DOMAIN},https://${APP_DOMAIN}:8443"
fi

cat > .env <<EOF
COMPOSE_PROJECT_NAME=gareappalto
APP_DOMAIN=${APP_DOMAIN}
VPS_IP=${VPS_IP}
FRONTEND_HTTP_PORT=${FRONTEND_HTTP_PORT}
FRONTEND_HTTPS_PORT=${FRONTEND_HTTPS_PORT}
VITE_API_URL=/api

DB_NAME=gare_appalto
DB_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

MINIO_ROOT_USER=${MINIO_ROOT_USER}
MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
AWS_STORAGE_BUCKET_NAME=gare-appalto
EOF

cat > backend/.env <<EOF
SECRET_KEY=${SECRET_KEY}
DEBUG=False

ALLOWED_HOSTS=${VPS_IP},${APP_DOMAIN},backend,localhost,127.0.0.1

DB_NAME=gare_appalto
DB_USER=postgres
DB_PASSWORD=${POSTGRES_PASSWORD}
DB_HOST=db
DB_PORT=5432

CORS_ALLOWED_ORIGINS=${CORS_ORIGINS}
CSRF_TRUSTED_ORIGINS=${CSRF_ORIGINS}

CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
CELERY_TASK_ALWAYS_EAGER=False

USE_S3=True
AWS_ACCESS_KEY_ID=${MINIO_ROOT_USER}
AWS_SECRET_ACCESS_KEY=${MINIO_ROOT_PASSWORD}
AWS_STORAGE_BUCKET_NAME=gare-appalto
AWS_S3_ENDPOINT_URL=http://minio:9000
AWS_S3_REGION_NAME=us-east-1

SECURE_SSL_REDIRECT=False
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_PRELOAD=False

LLM_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
EOF

chmod 600 backend/.env .env
echo "Creati .env e backend/.env con segreti generati."
echo "Modifica backend/.env e imposta OPENAI_API_KEY prima del deploy."
echo "Per creare l'admin: ADMIN_EMAIL=... ADMIN_PASSWORD=... ./scripts/create-admin.sh"
