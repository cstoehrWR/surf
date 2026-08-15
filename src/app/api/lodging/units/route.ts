import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";

export async function GET() {
  try {
    const { organizationId } = await requireTenant("products.read");
    const units = await prisma.lodgingUnit.findMany({
      where: orgWhere(organizationId),
      include: { product: true, location: true },
      orderBy: { code: "asc" },
    });
    return NextResponse.json({ data: units });
  } catch (error) {
    return handleError(error);
  }
}

const schema = z.object({
  productId: z.string(),
  locationId: z.string(),
  name: z.string().min(1),
  code: z.string().min(1),
  capacity: z.coerce.number().int().min(1).default(2),
  active: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await requireTenant("products.write");
    const orgId = organizationId ?? user.organizationId;
    if (!orgId) return jsonError("Organization required");
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const unit = await prisma.lodgingUnit.create({
      data: {
        organizationId: orgId,
        productId: parsed.data.productId,
        locationId: parsed.data.locationId,
        name: parsed.data.name,
        code: parsed.data.code,
        capacity: parsed.data.capacity,
        active: parsed.data.active ?? true,
      },
      include: { product: true, location: true },
    });
    return NextResponse.json({ data: unit }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireTenant("products.write");
    const body = await request.json();
    const id = z.string().parse(body.id);
    const unit = await prisma.lodgingUnit.update({
      where: { id },
      data: {
        name: body.name,
        capacity: body.capacity,
        active: body.active,
      },
      include: { product: true, location: true },
    });
    return NextResponse.json({ data: unit });
  } catch (error) {
    return handleError(error);
  }
}
