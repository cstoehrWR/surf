export type HandbookSection = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  tips?: string[];
  screenshot?: string;
  href?: string;
};

export const handbookSections: HandbookSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    summary: "Tagesüberblick: Sessions, Auslastung, offene Zahlungen, fehlende Waiver und Warteliste.",
    steps: [
      "Nach dem Login landest du auf dem Dashboard der aktiven Organisation.",
      "Prüfe KPIs wie Sessions heute, Umsatz und offene Zahlungen.",
      "Nutze die Listen für kommende Buchungen und Stornierungen als Einstieg.",
    ],
    tips: ["Organisation oben links wechseln (Org-Switcher), falls du mehrere Schulen betreust."],
    screenshot: "/handbook/dashboard.png",
    href: "/admin",
  },
  {
    id: "bookings",
    title: "Buchungen",
    summary: "Alle Buchungen der Organisation: Status, Zahlung, Kundenlink und Tresen-Aktionen.",
    steps: [
      "Öffne Buchungen für die Liste oder „Manuelle Buchung“ für Walk-ins.",
      "Klicke auf die Buchungsnummer für Details.",
      "Im Detail: Portal-Link kopieren, Barzahlung buchen, stornieren, Refund oder Gutschein einlösen.",
      "Check-in einzelner Teilnehmer direkt am Buchungsdetail.",
    ],
    tips: ["Portal-Link an Kunden senden, wenn die Bestätigungsmail fehlt."],
    screenshot: "/handbook/bookings.png",
    href: "/admin/bookings",
  },
  {
    id: "sessions",
    title: "Sessions & Tag-of",
    summary: "Session-Detail mit Check-in, Attendance, Material und Wetter/Absage.",
    steps: [
      "Sessions öffnen und die gewünschte Kurszeit wählen.",
      "Teilnehmer checken ein, Attendance setzen und Material zuweisen.",
      "Bei Wind/Wetter: Status auf Wetter-Check, Verschieben oder Absage setzen – Kunden werden benachrichtigt.",
    ],
    screenshot: "/handbook/sessions.png",
    href: "/admin/sessions",
  },
  {
    id: "planner",
    title: "Planner & Kalender",
    summary: "Tages- und Wochenplanung für Kurse und Ressourcen.",
    steps: [
      "Planner für die operative Tagesansicht nutzen.",
      "Kalender für die Wochenübersicht der Sessions.",
    ],
    screenshot: "/handbook/planner.png",
    href: "/admin/planner",
  },
  {
    id: "products",
    title: "Produkte & Kurse",
    summary: "Kurse, Privatstunden, Verleih, Add-ons und Unterkunftsprodukte pflegen.",
    steps: [
      "Produkt anlegen: Name, Standort, Typ, Sport, Preis, Dauer, Startzeiten.",
      "Optional Saisonfenster und Materialbedarf setzen.",
      "Veröffentlichen, damit der Kurs im öffentlichen Booking erscheint.",
    ],
    screenshot: "/handbook/products.png",
    href: "/admin/products",
  },
  {
    id: "locations",
    title: "Standorte",
    summary: "Standorte inkl. Öffnungszeiten und Sperrzeiten (Blackouts).",
    steps: [
      "Standort anlegen mit Name, Slug und Adresse.",
      "Unter Öffnungszeiten Wochentage und Zeiten setzen.",
      "Sperrzeiten für Sturm, Events oder Wartung eintragen.",
    ],
    tips: ["Sperrzeiten blockieren Sofort die Availability Engine."],
    screenshot: "/handbook/locations.png",
    href: "/admin/locations",
  },
  {
    id: "instructors",
    title: "Surflehrer",
    summary: "Lehrer/Guides, Qualifikationen und Abwesenheiten.",
    steps: [
      "Lehrer anlegen und Standorten zuweisen.",
      "Abwesenheiten pflegen – sie fließen in die Verfügbarkeit ein.",
    ],
    screenshot: "/handbook/instructors.png",
    href: "/admin/instructors",
  },
  {
    id: "resources",
    title: "Ressourcen / Material",
    summary: "Boards, Neopren etc. und Ausgabe am Session-Tag.",
    steps: [
      "Ressourcen und Typen im Admin pflegen.",
      "Am Session-Tag Material zuweisen und Rückgabe/Schäden notieren.",
    ],
    screenshot: "/handbook/resources.png",
    href: "/admin/resources",
  },
  {
    id: "customers",
    title: "Kunden",
    summary: "Kundenliste und Detail mit Buchungshistorie und Einwilligungen.",
    steps: [
      "Kundenliste öffnen und einen Namen anklicken.",
      "Im Detail Buchungen, Consents und Kontaktdaten einsehen.",
    ],
    screenshot: "/handbook/customers.png",
    href: "/admin/customers",
  },
  {
    id: "waivers",
    title: "Waiver-Vorlagen",
    summary: "Teilnahmeerklärungen anlegen, Versionieren und an Produkte koppeln.",
    steps: [
      "Vorlage mit Text und Produkt-Verknüpfung anlegen.",
      "Bei Textänderungen steigt die Version – alte Unterschriften bleiben gültig.",
      "Kunden unterschreiben im Portal vor dem Kurs.",
    ],
    screenshot: "/handbook/waivers.png",
    href: "/admin/waivers",
  },
  {
    id: "pricing",
    title: "Preise, Gutscheine & Rabatte",
    summary: "Preisregeln, Wertgutscheine und Checkout-Rabattcodes.",
    steps: [
      "Preisregeln (Weekend, Early Bird, Season, Group …) unter Preise pflegen.",
      "Gutscheine = Guthaben, einlösbar am Buchungsdetail.",
      "Rabattcodes = Prozent/Betrag im öffentlichen Checkout (z. B. EARLY10).",
    ],
    screenshot: "/handbook/pricing.png",
    href: "/admin/pricing",
  },
  {
    id: "seasons",
    title: "Saisons",
    summary: "Org- oder Standort-Saisons begrenzen buchbare Zeiträume.",
    steps: [
      "Saison mit Von/Bis anlegen (optional nur für einen Standort).",
      "Existieren Saisons, sind Buchungen außerhalb nicht verfügbar.",
    ],
    screenshot: "/handbook/seasons.png",
    href: "/admin/seasons",
  },
  {
    id: "automations",
    title: "Automationen",
    summary: "Reminder-, Waiver- und Follow-up-Mails zeitgesteuert.",
    steps: [
      "Regel anlegen: Trigger, Offset in Stunden, Aktion.",
      "Aktivieren/Deaktivieren oder manuell ausführen.",
      "In Produktion per Cron `/api/cron/automations` auslösen.",
    ],
    screenshot: "/handbook/automations.png",
    href: "/admin/automations",
  },
  {
    id: "website",
    title: "Website & Anfragen",
    summary: "Tenant-Website, Page Builder, Domain, Kontakt-Inbox und Uploads.",
    steps: [
      "Unter Website Farben, Hero, Kontakt und Custom Domain setzen.",
      "Seiten und Blöcke (Hero, Kurse, FAQ, Kontakt …) pflegen.",
      "Kontaktformular-Nachrichten unter Anfragen bearbeiten.",
    ],
    screenshot: "/handbook/website.png",
    href: "/admin/website",
  },
  {
    id: "reports",
    title: "Reports & Webhooks",
    summary: "Umsatz/Auslastung und externe Integrationen.",
    steps: [
      "Reports mit Zeitraum filtern und optional als CSV exportieren.",
      "Webhooks für Events wie booking.confirmed oder contact.received einrichten.",
    ],
    screenshot: "/handbook/reports.png",
    href: "/admin/reports",
  },
  {
    id: "lodging",
    title: "Unterkunft / Camping",
    summary: "Nacht-Buchung für Unterkunftseinheiten (Stay-Tenant).",
    steps: [
      "Unterkunftseinheiten unter Unterkunft anlegen und einem Produkt zuordnen.",
      "Öffentliche Buchung über `/o/[slug]/stay`.",
    ],
    screenshot: "/handbook/lodging.png",
    href: "/admin/lodging",
  },
  {
    id: "waitlist",
    title: "Warteliste",
    summary: "Interessenten bei ausgebuchten Sessions nachrücken lassen.",
    steps: [
      "Warteliste prüfen und Einträge verwalten.",
      "Nach Storno kann die Automation den nächsten Kandidaten benachrichtigen.",
    ],
    screenshot: "/handbook/waitlist.png",
    href: "/admin/waitlist",
  },
  {
    id: "inbox",
    title: "Anfragen-Inbox",
    summary: "Nachrichten vom Website-Kontaktformular.",
    steps: [
      "Neue Anfragen unter Anfragen öffnen.",
      "Als gelesen oder erledigt markieren.",
      "Bei hinterlegter Kontakt-E-Mail erhält die Schule zusätzlich eine Mail.",
    ],
    screenshot: "/handbook/inbox.png",
    href: "/admin/inbox",
  },
  {
    id: "discount-codes",
    title: "Rabattcodes",
    summary: "Prozent- oder Betragsrabatte für den Checkout.",
    steps: [
      "Code mit Prozent oder Betrag anlegen.",
      "Kunden geben den Code im Buchungs-Wizard ein (Demo: EARLY10).",
    ],
    screenshot: "/handbook/discount-codes.png",
    href: "/admin/discount-codes",
  },
  {
    id: "booking-public",
    title: "Öffentliche Buchung",
    summary: "Kunden buchen über `/o/[slug]/book` oder Custom Domain.",
    steps: [
      "Wizard: Standort → Kurs → Datum → Uhrzeit → Teilnehmer → AGB → Zahlung.",
      "Optional Rabattcode eingeben.",
      "Nach Zahlung Bestätigung und Portal-Link.",
    ],
    screenshot: "/handbook/booking-public.png",
    href: "/o/north-sea-surf/book",
  },
];
