/** Map pretty custom-domain paths to internal /o/[slug]/... routes. */
export function mapCustomDomainPath(pathname: string, slug: string) {
  if (pathname === "/" || pathname === "") return `/o/${slug}`;
  if (pathname === "/book" || pathname.startsWith("/book/")) {
    return `/o/${slug}${pathname}`;
  }
  if (pathname === "/stay" || pathname.startsWith("/stay/")) {
    return `/o/${slug}${pathname}`;
  }
  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    return pathname;
  }
  if (pathname === "/login" || pathname.startsWith("/login") || pathname.startsWith("/admin")) {
    return pathname;
  }
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
    return pathname;
  }
  if (pathname.startsWith("/o/")) return pathname;
  const page = pathname.replace(/^\//, "").split("/")[0];
  if (page) return `/o/${slug}/p/${page}`;
  return `/o/${slug}`;
}

export function normalizeHost(host: string) {
  return host.split(":")[0].toLowerCase().replace(/^www\./, "");
}

export function sitePath(params: {
  orgSlug: string;
  customDomain?: boolean;
  kind: "home" | "book" | "stay" | "page";
  pageSlug?: string;
}) {
  if (params.customDomain) {
    if (params.kind === "home") return "/";
    if (params.kind === "book") return "/book";
    if (params.kind === "stay") return "/stay";
    return `/${params.pageSlug}`;
  }
  if (params.kind === "home") return `/o/${params.orgSlug}`;
  if (params.kind === "book") return `/o/${params.orgSlug}/book`;
  if (params.kind === "stay") return `/o/${params.orgSlug}/stay`;
  return `/o/${params.orgSlug}/p/${params.pageSlug}`;
}

export function resolveCtaHref(orgSlug: string, href: unknown, customDomain = false) {
  const value = String(href ?? "book");
  if (value.startsWith("http")) return value;
  if (value.startsWith("/")) return value;
  if (value === "book") return sitePath({ orgSlug, customDomain, kind: "book" });
  if (value === "stay") return sitePath({ orgSlug, customDomain, kind: "stay" });
  return sitePath({ orgSlug, customDomain, kind: "page", pageSlug: value });
}

export const BLOCK_TEMPLATES: Record<string, Record<string, unknown>> = {
  HERO: {
    eyebrow: "Wassersport",
    headline: "Willkommen",
    text: "Kurse online buchen.",
    ctaLabel: "Jetzt buchen",
    ctaHref: "book",
  },
  TEXT: { title: "Titel", body: "Text hier…" },
  COURSES: { title: "Unsere Kurse", limit: 6 },
  CTA: {
    title: "Bereit?",
    text: "Jetzt Termin sichern.",
    ctaLabel: "Zur Buchung",
    ctaHref: "book",
  },
  CONTACT: { title: "Kontakt", text: "Wir freuen uns auf deine Nachricht." },
  FAQ: {
    title: "Häufige Fragen",
    items: [
      { q: "Was muss ich mitbringen?", a: "Handtuch und gute Laune – Material stellen wir." },
      { q: "Ab welchem Alter?", a: "Je nach Kurs ab 8 bzw. 12 Jahren." },
    ],
  },
  TEAM: {
    title: "Unser Team",
    members: [
      { name: "Alex", role: "Head Coach", text: "10 Jahre Nordsee-Erfahrung." },
      { name: "Sam", role: "Instructor", text: "Kids & Anfänger." },
    ],
  },
  GALLERY: {
    title: "Impressionen",
    images: [
      { url: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800", alt: "Welle" },
      { url: "https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=800", alt: "Strand" },
      { url: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=801", alt: "Surf" },
    ],
  },
  IMAGE: {
    url: "https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=1200",
    alt: "Impression",
    caption: "",
  },
};
