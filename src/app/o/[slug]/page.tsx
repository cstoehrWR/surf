import { notFound } from "next/navigation";
import { getPublicSite, ensureSiteForOrganization } from "@/lib/site/service";
import { TenantSiteShell, renderBlocks } from "@/components/site/tenant-site";

export default async function OrgLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let org = await getPublicSite(slug);
  if (!org) notFound();
  if (!org.site) {
    await ensureSiteForOrganization({
      organizationId: org.id,
      name: org.name,
      tagline: org.tagline,
    });
    org = await getPublicSite(slug);
    if (!org) notFound();
  }
  if (org.site && !org.site.published) notFound();

  const home = org.sitePages.find((p) => p.slug === "home") ?? org.sitePages[0];
  if (!home) notFound();

  const pages = org.sitePages.map((p) => ({
    ...p,
    blocks: p.blocks.map((b) => ({
      ...b,
      content: b.content as Record<string, unknown>,
    })),
  }));

  return (
    <TenantSiteShell org={org} pages={pages} activeSlug="home">
      {renderBlocks(org, home.blocks.map((b) => ({ ...b, content: b.content as Record<string, unknown> })))}
    </TenantSiteShell>
  );
}
