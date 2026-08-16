import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";

async function loadOwned(id: string, organizationId: string | null) {
  return prisma.waiverTemplate.findFirst({
    where: { id, ...orgWhere(organizationId) },
    include: {
      products: { include: { product: true } },
      _count: { select: { signatures: true } },
    },
  });
}

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  body: z.string().min(20).optional(),
  minAge: z.coerce.number().int().min(0).optional().nullable(),
  locationId: z.string().optional().nullable(),
  productIds: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  bumpVersion: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await requireTenant("settings.manage");
    const { id } = await context.params;
    const existing = await loadOwned(id, organizationId);
    if (!existing) return jsonError("Not found", 404);

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    const bodyChanged = parsed.data.body != null && parsed.data.body !== existing.body;
    const shouldBump = Boolean(parsed.data.bumpVersion) || bodyChanged;

    if (parsed.data.productIds) {
      await prisma.waiverTemplateProduct.deleteMany({ where: { templateId: id } });
    }

    const updated = await prisma.waiverTemplate.update({
      where: { id },
      data: {
        name: parsed.data.name,
        body: parsed.data.body,
        minAge: parsed.data.minAge === undefined ? undefined : parsed.data.minAge,
        locationId: parsed.data.locationId === undefined ? undefined : parsed.data.locationId || null,
        active: parsed.data.active,
        version: shouldBump ? { increment: 1 } : undefined,
        products: parsed.data.productIds
          ? { create: parsed.data.productIds.map((productId) => ({ productId })) }
          : undefined,
      },
      include: {
        products: { include: { product: true } },
        _count: { select: { signatures: true } },
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleError(error);
  }
}
