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
- **Release 2:** Customer Portal, Waiver, Materialausgabe/Check-in, E-Mail-Automationen, Gutscheine, Refunds
- **Release 3:** Advanced Pricing, Warteliste, Reporting-Ausbau, Webhooks-Dispatch
- **Release 4 (aktuell):** Multi-Tenant-SaaS, Sportarten (Surf/Kite/SUP), Unterkunft/Camping (Nacht-Buchung)
- **Stammdaten-Pflege:** Kurse/Produkte, Sessions, Standorte, Ressourcen/Material, Surflehrer und Unterkunftseinheiten sind im Admin anlegbar/editierbar
- **Website-CMS:** Jede Schule kann unter `/admin/website` eine komplette Website pflegen (Seiten, Blöcke, Farben) – öffentlich unter `/o/[slug]`
- **Custom Domains:** Domain im Website-Editor eintragen; Middleware mappt Host → Tenant (z. B. `/book` statt `/o/slug/book`)
- **Page Builder:** Blöcke Hero, Text, Kurse, CTA, Kontakt, FAQ, Team, Galerie, Bild + Reihenfolge
- **Website-Extras:** Kontaktformular → Anfragen-Inbox, Bild-Upload, SEO-Titel, Booking/Stay im Tenant-Design
- **Tresen:** Buchungsdetail mit Portal-Link, Barzahlung und Storno; Bestätigungsmail mit Portal-URL
- **Später:** Partnerportal, TLS/DNS-Automatisierung, Drag-and-drop WYSIWYG

## Multi-Tenant

- Öffentliche Orgs: `/o/north-sea-surf`, `/o/wattenmeer-stay`
- Übernachtung: `/o/wattenmeer-stay/stay`
- Org-Switcher im Admin (Memberships)
- Login Stay: `admin@wattenmeer.example` / `SurfDemo!2026`
