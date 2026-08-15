import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/api/guard";

export async function GET(request: NextRequest) {
  if (!rateLimit(request.headers.get("x-forwarded-for") ?? "products", 120)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId") ?? undefined;
  const organizationId = searchParams.get("organizationId") ?? undefined;
  const orgSlug = searchParams.get("org") ?? undefined;
  const sportType = searchParams.get("sportType") ?? undefined;
  const bookingMode = searchParams.get("bookingMode") ?? undefined;

  let orgId = organizationId;
  if (!orgId && orgSlug) {
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug, active: true } });
    orgId = org?.id;
  }

  const products = await prisma.product.findMany({
    where: {
      published: true,
      ...(locationId ? { locationId } : {}),
      ...(orgId ? { organizationId: orgId } : {}),
      ...(sportType ? { sportType: sportType as never } : {}),
      ...(bookingMode ? { bookingMode: bookingMode as never } : {}),
    },
    include: { variants: true, images: true, location: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    data: products.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
      taxRate: Number(p.taxRate),
      variants: p.variants.map((v) => ({ ...v, price: Number(v.price) })),
    })),
  });
}
