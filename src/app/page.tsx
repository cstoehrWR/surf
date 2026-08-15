import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/db";

export default async function HomePage() {
  const orgs = await prisma.organization.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20">
        <section className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-800 via-cyan-800 to-sky-900 p-8 text-white md:p-14">
          <p className="text-sm uppercase tracking-[0.2em] text-teal-100">Multi-Tenant Plattform</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight md:text-6xl">
            Surf, Kite & Stay – eine Buchungsplattform.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-teal-50/90">
            Mandantenfähige SaaS für Schulen und Unterkünfte: Kurse, Sportarten und Übernachtungen.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/o/north-sea-surf"
              className="rounded-2xl bg-amber-200 px-6 py-3 font-semibold text-teal-950"
            >
              Surfschule öffnen
            </Link>
            <Link href="/login" className="rounded-2xl border border-white/30 px-6 py-3 font-semibold">
              Mitarbeiter-Login
            </Link>
          </div>
        </section>
        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/o/${org.slug}`}
              className="rounded-2xl bg-white p-6 shadow-sm transition hover:ring-2 hover:ring-teal-700"
            >
              <p className="text-xs uppercase text-slate-500">{org.sports.join(" · ")}</p>
              <h2 className="mt-1 text-xl font-semibold text-teal-900">{org.name}</h2>
              <p className="mt-2 text-sm text-slate-600">{org.tagline}</p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
