import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";

async function ownedLocation(id: string, organizationId: string | null) {
  return prisma.location.findFirst({ where: { id, ...orgWhere(organizationId) } });
}

const hoursSchema = z.object({
  hours: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      openTime: z.string().regex(/^\d{2}:\d{2}$/),
      closeTime: z.string().regex(/^\d{2}:\d{2}$/),
      closed: z.boolean().optional(),
    }),
  ),
});

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await requireTenant("settings.manage");
    const { id } = await context.params;
    const location = await ownedLocation(id, organizationId);
    if (!location) return jsonError("Not found", 404);

    const parsed = hoursSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    const openDays = parsed.data.hours.filter((h) => !h.closed);
    await prisma.$transaction([
      prisma.openingHours.deleteMany({ where: { locationId: id } }),
      ...openDays.map((h) =>
        prisma.openingHours.create({
          data: {
            locationId: id,
            weekday: h.weekday,
            openTime: h.openTime,
            closeTime: h.closeTime,
          },
        }),
      ),
    ]);

    const hours = await prisma.openingHours.findMany({
      where: { locationId: id },
      orderBy: { weekday: "asc" },
    });
    return NextResponse.json({ data: hours });
  } catch (error) {
    return handleError(error);
  }
}
