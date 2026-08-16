import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublicSite, ensureSiteForOrganization } from "@/lib/site/service";
import { TenantSiteShell } from "@/components/site/tenant-site";
import { BookingWizard } from "@/components/booking/booking-wizard";

export default async function OrgBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let org = await getPublicSite(slug);
  if (!org) notFound();
  if (!org.site) {
    await ensureSiteForOrganization({ organizationId: org.id, name: org.name, tagline: org.tagline });
    org = await getPublicSite(slug);
    if (!org) notFound();
  }
  const customDomain = (await headers()).get("x-tenant-custom-domain") === "1";
  const pages = org.sitePages.map((p) => ({
    ...p,
    blocks: p.blocks.map((b) => ({ ...b, content: b.content as Record<string, unknown> })),
  }));
  const primary = org.site?.primaryColor ?? "#0f766e";

  return (
    <TenantSiteShell org={org} pages={pages} activeSlug="book" customDomain={customDomain}>
      <h1 className="text-3xl font-semibold" style={{ color: primary }}>
        Kurs buchen
      </h1>
      <p className="mt-2 text-sm text-slate-600">{org.tagline}</p>
      <div className="mt-8">
        <BookingWizard orgSlug={org.slug} />
      </div>
    </TenantSiteShell>
  );
}
