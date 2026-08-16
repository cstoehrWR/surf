# Deploy

## Voraussetzungen

- Docker + Docker Compose
- Domain mit HTTPS (Reverse Proxy, z. B. Caddy/Traefik/Cloudflare)
- Resend-Account (oder `EMAIL_PROVIDER=console` nur zum Testen)
- Optional: Stripe Keys

## Schnellstart Produktion

```bash
cp .env.example .env
# Pflichtwerte setzen:
# AUTH_SECRET, APP_URL, AUTH_URL, EMAIL_FROM, POSTGRES_PASSWORD, CRON_SECRET
# Für echte Mails: EMAIL_PROVIDER=resend, RESEND_API_KEY

docker compose -f docker-compose.prod.yml up -d --build
```

Erstes Seed (nur einmal, Demo-Daten):

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma db seed
```

Healthcheck: `GET /api/health` (prüft DB).

## Automationen (Cron)

Geschützt mit `CRON_SECRET`:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://DEINE-DOMAIN/api/cron/automations
```

Optional Compose-Profil:

```bash
docker compose -f docker-compose.prod.yml --profile cron up -d
```

## E-Mail

| Variable | Bedeutung |
| --- | --- |
| `EMAIL_PROVIDER` | `console` (Logs) oder `resend` |
| `RESEND_API_KEY` | API-Key |
| `EMAIL_FROM` | Verifizierte Absenderadresse bei Resend |
| `APP_URL` | Basis-URL für Portal-Links in Mails |

SMTP ist bewusst nicht implementiert; Resend ist der Produktionsweg.

## Stripe

Ohne `STRIPE_SECRET_KEY` nutzt die App den Mock-Provider (Buchungen werden direkt bestätigt). Für Live-Zahlungen Keys + Webhook auf `/api/payments/webhook` (falls vorhanden) setzen.

## Custom Domains

1. Domain im Website-CMS eintragen
2. DNS A/CNAME auf den App-Host
3. TLS am Reverse Proxy
4. `NEXT_PUBLIC_ROOT_DOMAIN` auf die Plattform-Domain setzen

## Checkliste vor Go-Live

- [ ] `DEMO_MODE=false`
- [ ] Starke `AUTH_SECRET` / `POSTGRES_PASSWORD` / `CRON_SECRET`
- [ ] Resend-Domain verifiziert, Test-Mail prüfen
- [ ] Backup für Postgres-Volume
- [ ] Uploads: lokal unter `public/uploads` oder später S3/MinIO
- [ ] Demo-Logins ändern bzw. Seed-Accounts deaktivieren
