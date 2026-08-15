import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type BlockContent = Record<string, unknown>;

export const DEFAULT_PAGES: Array<{
  slug: string;
  title: string;
  navLabel: string;
  sortOrder: number;
  showInNav: boolean;
  blocks: Array<{ type: string; content: BlockContent }>;
}> = [
  {
    slug: "home",
    title: "Startseite",
    navLabel: "Home",
    sortOrder: 0,
    showInNav: true,
    blocks: [
      {
        type: "HERO",
        content: {
          eyebrow: "Wassersport & Kurse",
          headline: "Deine Schule. Deine Wellen.",
          text: "Kurse online buchen – Verfügbarkeit, Material und Team in einem System.",
          ctaLabel: "Jetzt buchen",
          ctaHref: "book",
        },
      },
      {
        type: "TEXT",
        content: {
          title: "Über uns",
          body: "Wir bringen dich sicher und mit Spaß aufs Wasser – von Anfänger bis Fortgeschritten.",
        },
      },
      { type: "COURSES", content: { title: "Unsere Kurse", limit: 6 } },
      {
        type: "CTA",
        content: {
          title: "Bereit für die nächste Session?",
          text: "Wähle Kurs, Datum und Teilnehmer – verbindlich in wenigen Minuten.",
          ctaLabel: "Zur Buchung",
          ctaHref: "book",
        },
      },
    ],
  },
  {
    slug: "about",
    title: "Über uns",
    navLabel: "Über uns",
    sortOrder: 1,
    showInNav: true,
    blocks: [
      {
        type: "TEXT",
        content: {
          title: "Unsere Schule",
          body: "Erfahrene Guides, gutes Material und klare Sicherheit – damit du Fortschritte machst.",
        },
      },
    ],
  },
  {
    slug: "courses",
    title: "Kurse",
    navLabel: "Kurse",
    sortOrder: 2,
    showInNav: true,
    blocks: [{ type: "COURSES", content: { title: "Kursangebot", limit: 20 } }],
  },
  {
    slug: "contact",
    title: "Kontakt",
    navLabel: "Kontakt",
    sortOrder: 3,
    showInNav: true,
    blocks: [
      {
        type: "CONTACT",
        content: { title: "Schreib uns", text: "Fragen zu Kursen, Gruppen oder Firmen-Events?" },
      },
    ],
  },
  {
    slug: "imprint",
    title: "Impressum",
    navLabel: "Impressum",
    sortOrder: 90,
    showInNav: false,
    blocks: [
      {
        type: "TEXT",
        content: {
          title: "Impressum",
          body: "Angaben gemäß § 5 TMG – bitte durch eure rechtlichen Daten ersetzen.",
        },
      },
    ],
  },
  {
    slug: "privacy",
    title: "Datenschutz",
    navLabel: "Datenschutz",
    sortOrder: 91,
    showInNav: false,
    blocks: [
      {
        type: "TEXT",
        content: {
          title: "Datenschutz",
          body: "Wir verarbeiten Buchungsdaten nur zur Durchführung eurer Kurse und Aufenthalte.",
        },
      },
    ],
  },
];

export async function ensureSiteForOrganization(params: {
  organizationId: string;
  name: string;
  tagline?: string | null;
  contactEmail?: string;
}) {
  const existing = await prisma.siteSettings.findUnique({
    where: { organizationId: params.organizationId },
  });
  if (existing) return existing;

  const settings = await prisma.siteSettings.create({
    data: {
      organizationId: params.organizationId,
      published: true,
      contactEmail: params.contactEmail,
      footerText: `© ${new Date().getFullYear()} ${params.name}`,
    },
  });

  for (const page of DEFAULT_PAGES) {
    const blocks = page.blocks.map((b, idx) => {
      const content = { ...b.content };
      if (b.type === "HERO") {
        content.headline = params.name;
        content.text = params.tagline ?? String(content.text ?? "");
      }
      return {
        type: b.type,
        sortOrder: idx,
        content: content as Prisma.InputJsonValue,
      };
    });
    await prisma.sitePage.create({
      data: {
        organizationId: params.organizationId,
        slug: page.slug,
        title: page.title,
        navLabel: page.navLabel,
        sortOrder: page.sortOrder,
        showInNav: page.showInNav,
        published: true,
        blocks: { create: blocks },
      },
    });
  }
  return settings;
}

export async function getPublicSite(slug: string) {
  const org = await prisma.organization.findFirst({
    where: { slug, active: true },
    include: {
      site: true,
      sitePages: {
        where: { published: true },
        include: { blocks: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      },
      products: { where: { published: true }, take: 24 },
      locations: { where: { active: true } },
    },
  });
  return org;
}

export function resolveCtaHref(orgSlug: string, href: unknown) {
  const value = String(href ?? "book");
  if (value.startsWith("http") || value.startsWith("/")) return value;
  if (value === "book") return `/o/${orgSlug}/book`;
  if (value === "stay") return `/o/${orgSlug}/stay`;
  return `/o/${orgSlug}/${value}`;
}
