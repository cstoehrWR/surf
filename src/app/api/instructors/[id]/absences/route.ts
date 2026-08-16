import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";

async function ownedInstructor(id: string, organizationId: string | null) {
  return prisma.instructor.findFirst({ where: { id, ...orgWhere(organizationId) } });
}

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await requireTenant("staff.write");
    const { id } = await context.params;
    const instructor = await ownedInstructor(id, organizationId);
    if (!instructor) return jsonError("Not found", 404);
    const data = await prisma.instructorAbsence.findMany({
      where: { instructorId: id },
      orderBy: { startsAt: "desc" },
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleError(error);
  }
}

const createSchema = z.object({
  startsAt: z.string(),
  endsAt: z.string(),
  reason: z.string().max(200).optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await requireTenant("staff.write");
    const { id } = await context.params;
    const instructor = await ownedInstructor(id, organizationId);
    if (!instructor) return jsonError("Not found", 404);

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const startsAt = new Date(parsed.data.startsAt);
    const endsAt = new Date(parsed.data.endsAt);
    if (!(endsAt > startsAt)) return jsonError("endsAt must be after startsAt");

    const absence = await prisma.instructorAbsence.create({
      data: {
        instructorId: id,
        startsAt,
        endsAt,
        reason: parsed.data.reason,
      },
    });
    return NextResponse.json({ data: absence }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await requireTenant("staff.write");
    const { id } = await context.params;
    const instructor = await ownedInstructor(id, organizationId);
    if (!instructor) return jsonError("Not found", 404);

    const absenceId = new URL(request.url).searchParams.get("absenceId");
    if (!absenceId) return jsonError("absenceId required");
    const existing = await prisma.instructorAbsence.findFirst({
      where: { id: absenceId, instructorId: id },
    });
    if (!existing) return jsonError("Not found", 404);
    await prisma.instructorAbsence.delete({ where: { id: absenceId } });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleError(error);
  }
}
