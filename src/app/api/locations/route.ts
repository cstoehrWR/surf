import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const orgSlug = new URL(request.url).searchParams.get("org") ?? undefined;
  const organizationId = new URL(request.url).searchParams.get("organizationId") ?? undefined;
  let orgId = organizationId;
  if (!orgId && orgSlug) {
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug, active: true } });
    orgId = org?.id;
  }
  const locations = await prisma.location.findMany({
    where: { active: true, ...(orgId ? { organizationId: orgId } : {}) },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: locations });
}
