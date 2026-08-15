# North Sea Surf School

Webbasierte Buchungs- und Verwaltungsplattform für Surfschulen (MVP / Release 1).

Fachliche und technische Architektur: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)  
OpenAPI: [`docs/openapi.yaml`](docs/openapi.yaml) bzw. `GET /api/openapi`

## Stack

Next.js 15 · TypeScript · Tailwind · PostgreSQL · Prisma · Auth.js · Zod · Vitest  
Docker Compose für Postgres, Redis, MinIO und die App.

## Lokal starten (Docker)

```bash
cp .env.example .env
docker compose up --build
```

App: http://localhost:3000

## Lokal ohne Docker

PostgreSQL und Redis müssen laufen. `.env` anpassen, dann:

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm test
npm run dev
```

## Demo-Zugang (Seed)

Organisation **North Sea Surf School**, Standort **Nordstrand**.

| Rolle | E-Mail | Passwort |
| --- | --- | --- |
| Admin | admin@northseasurf.example | SurfDemo!2026 |
| Super Admin | superadmin@northseasurf.example | SurfDemo!2026 |
| Rezeption | office@northseasurf.example | SurfDemo!2026 |
| Instructor Tom | tom@northseasurf.example | SurfDemo!2026 |
| Instructor Sarah | sarah@northseasurf.example | SurfDemo!2026 |

Nur für lokale Demo. In Produktion eigene Secrets in der Umgebung setzen, niemals im Repository.

Ohne `STRIPE_SECRET_KEY` bestätigt der Mock-Payment-Provider Buchungen direkt (keine Kartendaten).

## Wichtige URLs

- Öffentliche Buchung: `/book`
- Backoffice: `/admin`
- Session Planner: `/admin/planner`
- Health: `/api/health`
- Availability: `/api/availability?productId=...&locationId=...&date=YYYY-MM-DD&participants=1`

## Releases

- **Release 1:** Auth, RBAC, Produkte, Sessions, Availability Engine, Buchung, Zahlung, Dashboard, Planner
- **Release 2 (aktuell):** Customer Portal, Waiver, Materialausgabe/Check-in, E-Mail-Automationen, Gutscheine, Refunds
- **Release 3:** Advanced Pricing, Warteliste, Reporting-Ausbau, Webhooks-Dispatch
- **Release 4:** Multi-Tenant-SaaS, weitere Sportarten, Unterkunft
