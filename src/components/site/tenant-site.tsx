import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { resolveCtaHref } from "@/lib/site/service";

type Org = {
  slug: string;
  name: string;
  products: Array<{
    id: string;
    name: string;
    description: string;
    sportType: string;
    bookingMode: string;
    basePrice: unknown;
  }>;
  site: {
    primaryColor: string;
    accentColor: string;
    heroImageUrl: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    address: string | null;
    footerText: string | null;
    showBookingCta: boolean;
  } | null;
};

type Page = {
  slug: string;
  title: string;
  navLabel: string | null;
  showInNav: boolean;
  blocks: Array<{ id: string; type: string; content: Record<string, unknown> }>;
};

export function TenantSiteShell({
  org,
  pages,
  children,
  activeSlug,
}: {
  org: Org;
  pages: Page[];
  children: React.ReactNode;
  activeSlug: string;
}) {
  const site = org.site;
  const primary = site?.primaryColor ?? "#0f766e";
  const accent = site?.accentColor ?? "#fbbf24";
  const nav = pages.filter((p) => p.showInNav);

  return (
    <div style={{ ["--tenant-primary" as string]: primary, ["--tenant-accent" as string]: accent }}>
      <header className="border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href={`/o/${org.slug}`} className="text-lg font-bold" style={{ color: primary }}>
            {org.name}
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
            {nav.map((p) => (
              <Link
                key={p.slug}
                href={p.slug === "home" ? `/o/${org.slug}` : `/o/${org.slug}/p/${p.slug}`}
                className={activeSlug === p.slug ? "underline" : "opacity-80 hover:opacity-100"}
              >
                {p.navLabel ?? p.title}
              </Link>
            ))}
            {site?.showBookingCta && (
              <Link
                href={`/o/${org.slug}/book`}
                className="rounded-xl px-4 py-2 font-semibold text-teal-950"
                style={{ background: accent }}
              >
                Buchen
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 pb-20">{children}</main>
      <footer className="border-t border-black/5 bg-white/70">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-4 py-6 text-sm text-slate-600">
          <p>{site?.footerText ?? org.name}</p>
          <div className="flex gap-3">
            <Link href={`/o/${org.slug}/p/imprint`}>Impressum</Link>
            <Link href={`/o/${org.slug}/p/privacy`}>Datenschutz</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function renderBlocks(org: Org, blocks: Page["blocks"]) {
  return (
    <div className="space-y-10">
      {blocks.map((block) => {
        const c = block.content;
        if (block.type === "HERO") {
          return (
            <section
              key={block.id}
              className="overflow-hidden rounded-3xl p-8 text-white md:p-14"
              style={{
                background: org.site?.heroImageUrl
                  ? `linear-gradient(rgba(8,47,54,.55), rgba(8,47,54,.7)), url(${org.site.heroImageUrl}) center/cover`
                  : `linear-gradient(135deg, ${org.site?.primaryColor ?? "#0f766e"}, #164e63)`,
              }}
            >
              <p className="text-sm uppercase tracking-[0.2em] opacity-80">{String(c.eyebrow ?? "")}</p>
              <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight md:text-6xl">
                {String(c.headline ?? org.name)}
              </h1>
              <p className="mt-4 max-w-xl text-lg opacity-90">{String(c.text ?? "")}</p>
              <div className="mt-8">
                <Link
                  href={resolveCtaHref(org.slug, c.ctaHref)}
                  className="inline-block rounded-2xl px-6 py-3 font-semibold text-teal-950"
                  style={{ background: org.site?.accentColor ?? "#fbbf24" }}
                >
                  {String(c.ctaLabel ?? "Buchen")}
                </Link>
              </div>
            </section>
          );
        }
        if (block.type === "TEXT") {
          return (
            <section key={block.id} className="max-w-3xl">
              <h2 className="text-2xl font-semibold" style={{ color: org.site?.primaryColor }}>
                {String(c.title ?? "")}
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-slate-700">{String(c.body ?? "")}</p>
            </section>
          );
        }
        if (block.type === "COURSES") {
          const limit = Number(c.limit ?? 6);
          const list = org.products.slice(0, limit);
          return (
            <section key={block.id}>
              <h2 className="text-2xl font-semibold" style={{ color: org.site?.primaryColor }}>
                {String(c.title ?? "Kurse")}
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {list.map((p) => (
                  <article key={p.id} className="rounded-2xl bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase text-slate-500">
                      {p.sportType} · {p.bookingMode}
                    </p>
                    <h3 className="mt-1 font-semibold">{p.name}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">{p.description}</p>
                    <p className="mt-3 font-semibold">{formatMoney(Number(p.basePrice))}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        }
        if (block.type === "CTA") {
          return (
            <section
              key={block.id}
              className="rounded-3xl p-8 text-white"
              style={{ background: org.site?.primaryColor ?? "#0f766e" }}
            >
              <h2 className="text-2xl font-semibold">{String(c.title ?? "")}</h2>
              <p className="mt-2 opacity-90">{String(c.text ?? "")}</p>
              <Link
                href={resolveCtaHref(org.slug, c.ctaHref)}
                className="mt-4 inline-block rounded-2xl px-5 py-2.5 font-semibold text-teal-950"
                style={{ background: org.site?.accentColor ?? "#fbbf24" }}
              >
                {String(c.ctaLabel ?? "Buchen")}
              </Link>
            </section>
          );
        }
        if (block.type === "CONTACT") {
          return (
            <section key={block.id} className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold" style={{ color: org.site?.primaryColor }}>
                {String(c.title ?? "Kontakt")}
              </h2>
              <p className="mt-2 text-slate-700">{String(c.text ?? "")}</p>
              <div className="mt-4 space-y-1 text-sm">
                {org.site?.contactEmail && <p>E-Mail: {org.site.contactEmail}</p>}
                {org.site?.contactPhone && <p>Telefon: {org.site.contactPhone}</p>}
                {org.site?.address && <p>Adresse: {org.site.address}</p>}
              </div>
            </section>
          );
        }
        return (
          <section key={block.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <pre className="text-xs">{JSON.stringify(c, null, 2)}</pre>
          </section>
        );
      })}
    </div>
  );
}
