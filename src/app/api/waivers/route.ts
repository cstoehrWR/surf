import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";

export async function GET() {
  try {
    const { organizationId } = await requireTenant("settings.manage");
    const data = await prisma.waiverTemplate.findMany({
      where: orgWhere(organizationId),
      include: {
        products: { include: { product: true } },
        _count: { select: { signatures: true } },
      },
      orderBy: [{ name: "asc" }, { version: "desc" }],
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(2).max(120),
  body: z.string().min(20),
  minAge: z.coerce.number().int().min(0).optional().nullable(),
  locationId: z.string().optional().nullable(),
  productIds: z.array(z.string()).default([]),
  active: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await requireTenant("settings.manage");
    const orgId = organizationId ?? user.organizationId;
    if (!orgId) return jsonError("Organization required");
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    const template = await prisma.waiverTemplate.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name,
        body: parsed.data.body,
        minAge: parsed.data.minAge ?? null,
        locationId: parsed.data.locationId || null,
        active: parsed.data.active ?? true,
        products: parsed.data.productIds.length
          ? { create: parsed.data.productIds.map((productId) => ({ productId })) }
          : undefined,
      },
      include: {
        products: { include: { product: true } },
        _count: { select: { signatures: true } },
      },
    });
    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
