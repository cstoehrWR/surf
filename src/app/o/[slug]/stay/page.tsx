import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { LodgingWizard } from "@/components/booking/lodging-wizard";

export default async function OrgStayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await prisma.organization.findFirst({ where: { slug, active: true } });
  if (!org) notFound();

  return (
    <div>
      <SiteHeader brand={org.name} bookHref={`/o/${org.slug}/stay`} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold text-teal-950">Übernachtung · {org.name}</h1>
        <p className="mt-2 text-sm text-slate-600">Anreise/Abreise wählen – Verfügbarkeit pro Einheit und Nacht.</p>
        <div className="mt-8">
          <LodgingWizard orgSlug={org.slug} />
        </div>
      </main>
    </div>
  );
}
