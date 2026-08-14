import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/api/guard";

export async function GET(request: NextRequest) {
  if (!rateLimit(request.headers.get("x-forwarded-for") ?? "products", 120)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId") ?? undefined;
  const products = await prisma.product.findMany({
    where: { published: true, ...(locationId ? { locationId } : {}) },
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
