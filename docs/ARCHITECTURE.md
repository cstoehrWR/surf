# North Sea Surf School – Systemarchitektur (MVP)

## Vergleich mit Wiesmoor Ranch

Die Wiesmoor Ranch ist ein bestehendes Buchungssystem für Ferienwohnung und Camping. Die Surfschul-Plattform übernimmt bewährte fachliche Muster, ersetzt aber die technische Grundlage durch eine mandantenfähige SaaS-Architektur.

| Thema | Wiesmoor Ranch | Surfschule (dieses System) |
| --- | --- | --- |
| Hosting | Netlify (statische Seite + serverless functions) | Docker Compose, Next.js (Node), später SaaS-fähig |
| Persistenz | Buchungen/Verfügbarkeit als Dateien in einem GitHub-Repository | PostgreSQL + Prisma, transaktional |
| Frontend | Vanilla-JS (`site.min.js`), eigenes CSS | Next.js 15, React, TypeScript, Tailwind, shadcn-ähnliche Komponenten |
| Produkte | Zwei fest verdrahtete Angebote (Wohnung, Stellplatz) | Dynamischer Produktkatalog inkl. Varianten |
| Verfügbarkeit | Kalenderbelegung je Einheit/Nacht | Availability Engine: min(Kursplatz, Instructor, Ressourcen, Standort, Zeitfenster) |
| Überbuchungsschutz | Datei-Update, anfällig für Race Conditions | DB-Transaktion + Session-Version (Optimistic Lock) |
| Zahlung | Stripe Checkout + Bar bei Anreise | `PaymentProvider`-Interface; Stripe + Bar/Manuell + Mock |
| Gastbuchung ohne Account | Ja | Ja (Access-Token-Link) |
| Einwilligungen | AGB + Datenschutz vor verbindlicher Buchung | Identisch, zusätzlich Consent-Datensatz |
| Kartendaten | Nie selbst gespeichert | Identisch, nur Stripe |
| Admin | Geschützter interner Bereich | RBAC (Super Admin, Admin, Office, Instructor, Kunde) |
| Kalender | iCal-Import/Export | Session Planner (Tag/Woche), Admin-Kalender |
| E-Mail | Resend | `NotificationProvider` (Console/Resend) |
| DSGVO | Datenschutzerklärung, Auskunft/Löschung organisatorisch | Technische Grundlage: Consents, Audit, Export-Endpunkt, keine Gesundheitsdaten |

**Bewusst übernommene Ansätze:** verbindliche Buchung erst nach Preisdarstellung, Gast-Checkout, Stripe-Abstraktion, Barzahlung, AGB/Datenschutz-Checkboxen, Admin-Bereich, keine Kreditkartendaten im eigenen System.

**Bewusst nicht übernommen:** Git als Datenbank, hart codierte Produkte, Netlify-Forms als Buchungsbackend. Für Kurse mit Boards, Neopren und Instruktoren wäre das unsicher und nicht skalierbar.

---

## 1. Systemarchitektur

```
┌─────────────────────────────────────────────────────────────┐
│ Public Web (Next.js App Router)                             │
│  /  /book  /book/confirmation  /portal  /login              │
└───────────────┬─────────────────────────────────────────────┘
                │ Server Actions + REST /api/*
┌───────────────▼─────────────────────────────────────────────┐
│ Application Layer (TypeScript)                              │
│  Auth (Auth.js JWT) · RBAC · Zod Validation · Audit         │
│  AvailabilityEngine · BookingService · PricingEngine        │
│  PaymentProvider · NotificationProvider · WebhookDispatcher │
└───────────────┬─────────────────────────────────────────────┘
                │ Prisma ORM
┌───────────────▼─────────────────────────────────────────────┐
│ PostgreSQL          Redis/BullMQ (Jobs)     S3/MinIO        │
└─────────────────────────────────────────────────────────────┘
```

- **API-first:** Jede Mutation läuft serverseitig. Das Frontend darf nie allein autorisieren.
- **Modular:** Provider-Interfaces für Payment, Notification, Storage. Keine harte Kopplung an Stripe/Resend.
- **Mandantenfähig vorbereitet:** Fast alle Entitäten tragen `organizationId`. MVP nutzt eine Organisation.

---

## 2. Entity-Relationship (vereinfacht)

```
Organization 1──* Location 1──* Product 1──* ProductVariant
       │              │            │
       │              │            └──* ProductResourceRequirement → ResourceType
       │              │            └──* CourseSession
       │              │                      │
       │              └──* Resource ─────────┘
       │              └──* OpeningHours / Blackout / Season
       │
       ├──* User (Role)
       ├──* Instructor *──* CourseSession
       ├──* Customer 1──* Booking 1──* BookingItem → Product/Variant/Session
       │                         └──* Participant ──* SessionParticipant
       │                         └──* Payment / Invoice / WaiverSignature
       └──* PriceRule / Voucher / DiscountCode / AuditLog / WaitlistEntry
```

Eine **Session** ist die konkrete Durchführung eines Produkts. Mehrere Buchungen können Teilnehmer in dieselbe Session legen.

---

## 3. Prisma-Datenmodell

Siehe `prisma/schema.prisma`. Enthalten sind alle spezifizierten Entitäten inklusive Release-2/3-Tabellen (Waiver, Voucher, Waitlist, Webhooks), damit das Modell nicht umgebaut werden muss.

---

## 4. Rollen- und Berechtigungsmatrix

| Fähigkeit | Super Admin | Admin | Office | Instructor | Kunde |
| --- | --- | --- | --- | --- | --- |
| System-/Org-Einstellungen | ✓ | – | – | – | – |
| Produkte/Preise/Ressourcen/Mitarbeiter | ✓ | ✓ | – | – | – |
| Reports | ✓ | ✓ | – | – | – |
| Buchungen anlegen/ändern | ✓ | ✓ | ✓ | – | eigene |
| Check-in | ✓ | ✓ | ✓ | Anwesenheit | – |
| Zahlungen einsehen | ✓ | ✓ | ✓ | – | eigene |
| Zahlungen/Refunds ausführen | ✓ | ✓ | manuell/Bar | – | bezahlen |
| Sessions aller Standorte | ✓ | ✓ | ✓ | nur eigene | – |
| Override trotz Warnung | ✓ | ✓ | – | – | – |
| Eigene Buchung / Waiver / Portal | – | – | – | – | ✓ |

Durchsetzung ausschließlich serverseitig (`src/lib/rbac`).

---

## 5. Availability Engine

Zentrale Regel: **effektive Kapazität = Minimum aller Engpässe**.

```
effective = min(
  sessionCapacity,          // maxParticipants − gebuchte Teilnehmer − Holds
  instructorCapacity,       // verfügbare Instructoren × instructorRatio
  resourceCapacities...,    // floor((available − sessionFixed) / perParticipant)
)
```

Zusätzliche harte Checks (sonst `available = false`):

- Produkt veröffentlicht, Standort passend
- Wochentag / Startzeit / Saison / Öffnungszeiten / Sperrzeiten
- Buchungsvorlauf (`bookingLeadHours`)
- Session-Status nicht cancelled/completed
- Instructor nicht zeitgleich in anderer Session (Default: blockieren; Admin-Override mit Audit)
- `requestedParticipants <= effective`

Die Engine ist eine **pure Funktion** (`src/lib/availability/engine.ts`) und wird von einem DB-Service mit aktuellen Beständen gefüttert. So sind Unit Tests ohne Datenbank möglich.

---

## 6. Zentrale Buchungslogik

1. Request mit Zod validieren.
2. Transaktion öffnen, Session-Zeile sperren (`version` Optimistic Lock).
3. Availability Engine erneut rechnen (niemals Client-Werte vertrauen).
4. Bei Unterdeckung: Abbruch. Admin-Override nur mit `overrideReason` + AuditLog.
5. Customer upsert (E-Mail), Booking `PENDING`, Items mit **Preis-Snapshot**, Participants, SessionParticipant.
6. Zahlung über `PaymentProvider`. Bei Erfolg Status `CONFIRMED` / `PAID`.
7. Bestätigung über `NotificationProvider`.
8. Access-Token für Gast-Portal.

Preisänderungen an Produkten ändern bestehende Buchungen nicht, weil `BookingItem.unitPrice` und `priceBreakdown` gespeichert werden.

---

## 7. Projektordnerstruktur

```
prisma/                schema + seed + migrations
docs/                  Architektur, RBAC, Risiken
src/app/               App Router: public, admin, api
src/components/        UI (Booking, Admin, shadcn-artig)
src/lib/availability   Engine + Service
src/lib/booking        Buchungstransaktion
src/lib/pricing        Preisregeln
src/lib/payments       PaymentProvider
src/lib/notifications  NotificationProvider
src/lib/rbac           Permissions
src/lib/auth           Auth.js
src/messages           de.json / en.json
tests/                 Vitest (Engine) + API-Tests
```

---

## 8. MVP-Abgrenzung (Release 1 + Release 2)

**Release 1:** Auth, RBAC, Org/Standort, Produkte/Varianten, Sessions, Kunden/Teilnehmer, Availability Engine, öffentliches Booking, einfache Preise, Stripe/Mock-Zahlung, Bestätigung, Admin-Dashboard, Session Planner.

**Release 2 (umgesetzt):** Customer Portal, digitale Waiver, Materialausgabe/Check-in, E-Mail-Automationen, Gutscheine, Refunds.

**Release 3 (umgesetzt):** Advanced Pricing (Wochenende/Saison/Gruppe/Frühbucher/Last Minute), Warteliste mit Auto-Promote bei Storno, Reporting (Auslastung, Instructor, Filter/CSV), Webhook-Endpoints inkl. Delivery.

**Release 4 (umgesetzt):** Multi-Tenant (Memberships, Org-Switcher, API-Scoping, öffentliche `/o/[slug]`-Seiten), Sportarten (`SportType`), Unterkunft/Camping mit Nacht-Availability (`LodgingUnit`/`LodgingNight`).

**Website-CMS:** `SiteSettings` + `SitePage` + `SiteBlock` – Schulen pflegen Farben, Kontakt und Inhaltsblöcke (Hero, Text, Kurse, CTA, Kontakt, FAQ, Team, Galerie, Bild) unter `/admin/website`. Öffentliche Site unter `/o/[slug]` und `/o/[slug]/p/[page]`.

**Custom Domains:** `SiteSettings.customDomain` + Middleware-Rewrite (`mapCustomDomainPath`). Lookup über `/api/site/by-domain`. Auf Custom Domains gelten kurze URLs (`/`, `/book`, `/about`).

**Später:** Automatisches TLS/DNS (Cloudflare/Caddy), WYSIWYG Drag-and-drop.

---

## 9. Technische Risiken

| Risiko | Gegenmaßnahme |
| --- | --- |
| Überbuchung durch parallele Requests | Transaktion + `CourseSession.version` + Re-Check der Engine |
| Instructor-Doppelbelegung | Overlap-Query in der Engine; Override nur Admin + Audit |
| Ressourcen-Unterdeckung nach Statuswechsel (defekt) | Availability zählt nur `AVAILABLE` |
| Stripe-Webhook vs. Redirect-Race | Idempotente Payment-Referenz, Statusmaschine |
| Git-Persistenz (Ranch) skaliert nicht | PostgreSQL statt Dateien |
| XSS/CSRF/Injection | React-Escaping, Auth.js Cookies, Zod, Prisma |
| Brute Force Login | Lockout nach Fehlversuchen |
| Besondere Kategorien in Custom Fields | Flag `specialCategory`, Warnung, kein Health-Default |
| Preisregel ändert Altverträge | Snapshot auf BookingItem |
| Wetterabsage | SessionStatus inkl. weather_check/postponed (R2-Kommunikation) |

---

## 10. Annahmen (wo die Spezifikation offen war)

- Währung EUR, Zeitzone Europe/Berlin.
- Ohne Stripe-Keys arbeitet ein Mock-Payment-Provider (lokale Demo).
- Spezifische Board-/Neopren-Zuordnung ist Release 2; MVP prüft **Stückzahlen**.
- Ein Online-Checkout = eine Kurs-Session + optionale Add-ons.
- Standard-Steuersatz 19 %, sofern am Produkt nicht anders.
- Demo-Passwort nur in Seed/`.env.example`-Hinweisen, nicht als Produktionssecret.
