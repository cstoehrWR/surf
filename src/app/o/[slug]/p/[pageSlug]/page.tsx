import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublicSite, ensureSiteForOrganization } from "@/lib/site/service";
import { TenantSiteShell, renderBlocks } from "@/components/site/tenant-site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const org = await getPublicSite(slug);
  const page = org?.sitePages.find((p) => p.slug === pageSlug);
  if (!org || !page) return { title: "Seite" };
  return {
    title: `${page.title} · ${org.name}`,
    description: org.tagline ?? page.title,
  };
}

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
  const customDomain = (await headers()).get("x-tenant-custom-domain") === "1";

  const pages = org.sitePages.map((p) => ({
    ...p,
    blocks: p.blocks.map((b) => ({ ...b, content: b.content as Record<string, unknown> })),
  }));

  return (
    <TenantSiteShell org={org} pages={pages} activeSlug={pageSlug} customDomain={customDomain}>
      {renderBlocks(
        org,
        page.blocks.map((b) => ({ ...b, content: b.content as Record<string, unknown> })),
        customDomain,
      )}
    </TenantSiteShell>
  );
}
