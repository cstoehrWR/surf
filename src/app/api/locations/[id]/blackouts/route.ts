import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";

async function ownedLocation(id: string, organizationId: string | null) {
  return prisma.location.findFirst({ where: { id, ...orgWhere(organizationId) } });
}

const createSchema = z.object({
  startsAt: z.string(),
  endsAt: z.string(),
  reason: z.string().max(200).optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await requireTenant("settings.manage");
    const { id } = await context.params;
    const location = await ownedLocation(id, organizationId);
    if (!location) return jsonError("Not found", 404);

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    const startsAt = new Date(parsed.data.startsAt);
    const endsAt = new Date(parsed.data.endsAt);
    if (!(endsAt > startsAt)) return jsonError("endsAt must be after startsAt");

    const blackout = await prisma.blackoutPeriod.create({
      data: {
        locationId: id,
        startsAt,
        endsAt,
        reason: parsed.data.reason,
      },
    });
    return NextResponse.json({ data: blackout }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await requireTenant("settings.manage");
    const { id: locationId } = await context.params;
    const location = await ownedLocation(locationId, organizationId);
    if (!location) return jsonError("Not found", 404);

    const blackoutId = new URL(request.url).searchParams.get("blackoutId");
    if (!blackoutId) return jsonError("blackoutId required");

    const existing = await prisma.blackoutPeriod.findFirst({
      where: { id: blackoutId, locationId },
    });
    if (!existing) return jsonError("Not found", 404);

    await prisma.blackoutPeriod.delete({ where: { id: blackoutId } });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleError(error);
  }
}
