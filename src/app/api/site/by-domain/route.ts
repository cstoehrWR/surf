import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const host = (request.nextUrl.searchParams.get("host") ?? "")
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0];
  if (!host) return NextResponse.json({ error: "host required" }, { status: 400 });

  const site = await prisma.siteSettings.findFirst({
    where: {
      published: true,
      OR: [{ customDomain: host }, { customDomain: `www.${host}` }],
    },
    include: { organization: { select: { slug: true, active: true, name: true } } },
  });
  if (!site?.organization.active) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    {
      data: {
        slug: site.organization.slug,
        name: site.organization.name,
        organizationId: site.organizationId,
        customDomain: site.customDomain,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
