import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requirePermission, requireTenant } from "@/lib/api/guard";

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

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  basePrice: z.coerce.number().positive().optional(),
  durationMinutes: z.coerce.number().int().optional(),
  maxParticipants: z.coerce.number().int().optional(),
  minParticipants: z.coerce.number().int().optional(),
  published: z.boolean().optional(),
  startTimes: z.array(z.string()).optional(),
  weekdays: z.array(z.coerce.number().int()).optional(),
  sportType: z.enum(["SURF", "KITE", "SUP", "WINDSURF", "OTHER"]).optional(),
  bookingMode: z.enum(["SESSION", "NIGHTLY"]).optional(),
  type: z.string().optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("products.write");
    const { id } = await context.params;
    const existing = await prisma.product.findUniqueOrThrow({ where: { id } });
    const { organizationId } = await requireTenant("products.write");
    if (organizationId && existing.organizationId !== organizationId) {
      return jsonError("Forbidden", 403);
    }
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const product = await prisma.product.update({
      where: { id },
      data: parsed.data as never,
      include: { variants: true, location: true },
    });
    return NextResponse.json({
      data: {
        ...product,
        basePrice: Number(product.basePrice),
        taxRate: Number(product.taxRate),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("products.write");
    const { id } = await context.params;
    const existing = await prisma.product.findUniqueOrThrow({ where: { id } });
    const { organizationId } = await requireTenant("products.write");
    if (organizationId && existing.organizationId !== organizationId) {
      return jsonError("Forbidden", 403);
    }
    await prisma.product.update({ where: { id }, data: { published: false } });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleError(error);
  }
}
