# Gare Appalto

Piattaforma per la gestione di gare d'appalto: profili aziendali, documenti, scouting, relazioni tecniche, RAG e assistente AI.

**Stack:** Django REST + React (Vite) + PostgreSQL/pgvector + Redis + Celery + MinIO.

## Sviluppo locale

```bash
# Infrastruttura + backend + frontend
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# Oppure solo infrastruttura (DB, Redis, MinIO, Celery)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db redis minio minio-init celery_worker

# Backend manuale
cp backend/.env.example backend/.env
cd backend && python manage.py migrate && python manage.py runserver 8001

# Frontend manuale
cd frontend && npm install && npm run dev
```

- Frontend: http://localhost:5173 (dev) o http://localhost:3000 (Docker)
- Backend API: http://localhost:8001/api
- MinIO console: http://localhost:9001

Utente di sviluppo (solo con `DEBUG=True`):

```bash
python manage.py ensure_dev_user
```

## Produzione (VPS Ionos dedicato)

### Configurazione (una tantum)

1. Copia `scripts/deploy.config.example` in `scripts/deploy.config.ps1`
2. Compila IP, password SSH root, dominio (opzionale)
3. `$DedicatedVps = $true` usa porte **80/443** (VPS solo per Gare Appalto)

`deploy.config.ps1` è in `.gitignore` ? **mai** committare password.

### Primo deploy (VPS nuovo)

```powershell
.\scripts\deploy.ps1 -FirstSetup
```

Installa Docker sul server, clona da GitHub, genera `.env` con segreti, build locale, pubblica.

### Deploy successivi (automatico)

```powershell
.\scripts\deploy.ps1
```

Esegue: `git push` ? build Docker sul PC ? upload sul VPS ? riavvio stack.

```powershell
.\scripts\deploy.ps1 -SkipGitPush   # senza push git
```

### Admin e SSL

```bash
# Sul VPS dopo il primo deploy
ADMIN_EMAIL=tuo@email.it ADMIN_PASSWORD='password-sicura-12+' ./scripts/create-admin.sh
./scripts/setup-ssl.sh   # certificato Let's Encrypt (porta 80)
```

### VPS condiviso con Fontane Bianche (legacy)

Su server da 10GB con Fontane già su 80/443: `$DedicatedVps = $false` e porte 8080/8443.

### Avvio dopo reboot VPS

```bash
cd /var/www/gare-appalto
./scripts/vps-start.sh
```

### Celery (OCR, RAG, processing documenti)

Su VPS 1GB Celery è disabilitato di default. Per abilitarlo:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile celery up -d celery_worker
```

## Sicurezza produzione

- `DEBUG=False` obbligatorio (senza `SECRET_KEY` il backend non parte)
- Rate limiting su login e refresh token
- Database, Redis e MinIO non esposti su porte host in produzione
- Segreti generati da `init-production-env.sh` (mai committare `.env`)
- `ensure_dev_user` bloccato con `DEBUG=False`

## Repository

https://github.com/Antonin8686/gare_appalto
