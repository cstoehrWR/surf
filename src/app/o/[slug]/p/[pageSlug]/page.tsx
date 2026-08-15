import { notFound } from "next/navigation";
import { getPublicSite, ensureSiteForOrganization } from "@/lib/site/service";
import { TenantSiteShell, renderBlocks } from "@/components/site/tenant-site";

export default async function OrgCmsPage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug, pageSlug } = await params;
  let org = await getPublicSite(slug);
  if (!org) notFound();
  if (!org.site) {
    await ensureSiteForOrganization({ organizationId: org.id, name: org.name, tagline: org.tagline });
    org = await getPublicSite(slug);
    if (!org) notFound();
  }
  if (org.site && !org.site.published) notFound();

  const page = org.sitePages.find((p) => p.slug === pageSlug);
  if (!page) notFound();

  const pages = org.sitePages.map((p) => ({
    ...p,
    blocks: p.blocks.map((b) => ({ ...b, content: b.content as Record<string, unknown> })),
  }));

  return (
    <TenantSiteShell org={org} pages={pages} activeSlug={pageSlug}>
      {renderBlocks(
        org,
        page.blocks.map((b) => ({ ...b, content: b.content as Record<string, unknown> })),
      )}
    </TenantSiteShell>
  );
}
