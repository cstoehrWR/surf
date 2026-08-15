import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";

export default async function OrgLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await prisma.organization.findFirst({
    where: { slug, active: true },
    include: {
      locations: { where: { active: true } },
      products: { where: { published: true }, take: 8 },
    },
  });
  if (!org) notFound();

  const hasLodging = org.products.some((p) => p.bookingMode === "NIGHTLY");
  const hasSessions = org.products.some((p) => p.bookingMode === "SESSION");

  return (
    <div>
      <SiteHeader brand={org.name} bookHref={`/o/${org.slug}/book`} />
      <main className="mx-auto max-w-6xl px-4 pb-20">
        <section className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-800 via-cyan-800 to-sky-900 p-8 text-white md:p-14">
          <p className="text-sm uppercase tracking-[0.2em] text-teal-100">
            {org.locations.map((l) => l.name).join(" · ") || org.slug}
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight md:text-6xl">{org.name}</h1>
          <p className="mt-4 max-w-xl text-lg text-teal-50/90">
            {org.tagline ?? "Online buchen – Kurse, Sportarten und Aufenthalte."}
          </p>
          <p className="mt-2 text-sm text-teal-100/80">Sportarten: {org.sports.join(", ")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {hasSessions && (
              <Link href={`/o/${org.slug}/book`} className="rounded-2xl bg-amber-200 px-6 py-3 font-semibold text-teal-950">
                Kurs buchen
              </Link>
            )}
            {hasLodging && (
              <Link
                href={`/o/${org.slug}/stay`}
                className="rounded-2xl border border-white/30 px-6 py-3 font-semibold"
              >
                Übernachtung
              </Link>
            )}
          </div>
        </section>
        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {org.products.map((p) => (
            <div key={p.id} className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-xs uppercase text-slate-500">
                {p.sportType} · {p.bookingMode}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-teal-900">{p.name}</h2>
              <p className="mt-2 text-sm text-slate-600 line-clamp-3">{p.description}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
