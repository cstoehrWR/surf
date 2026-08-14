import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: true,
      images: true,
      location: true,
      requirements: { include: { resourceType: true } },
      translations: true,
    },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    data: {
      ...product,
      basePrice: Number(product.basePrice),
      taxRate: Number(product.taxRate),
      variants: product.variants.map((v) => ({ ...v, price: Number(v.price) })),
    },
  });
}
