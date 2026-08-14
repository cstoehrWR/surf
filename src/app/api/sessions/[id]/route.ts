import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addMinutes } from "@/lib/utils";
import { patchSessionSchema } from "@/lib/validation/schemas";
import { handleError, jsonError, requirePermission } from "@/lib/api/guard";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("sessions.read");
    const { id } = await context.params;
    const session = await prisma.courseSession.findUnique({
      where: { id },
      include: {
        product: true,
        location: true,
        instructors: { include: { instructor: true } },
        participants: {
          include: {
            participant: true,
            booking: { include: { customer: true, payments: true } },
            resources: { include: { resource: true } },
          },
        },
      },
    });
    if (!session) return jsonError("Not found", 404);
    return NextResponse.json({ data: session });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("sessions.write");
    const { id } = await context.params;
    const parsed = patchSessionSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const current = await prisma.courseSession.findUniqueOrThrow({
      where: { id },
      include: { product: true, instructors: true },
    });

    const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : current.startsAt;
    const endsAt = parsed.data.startsAt
      ? addMinutes(startsAt, current.product.durationMinutes)
      : current.endsAt;

    if (parsed.data.instructorIds) {
      await prisma.sessionInstructor.deleteMany({ where: { sessionId: id } });
    }

    const updated = await prisma.courseSession.update({
      where: { id },
      data: {
        startsAt,
        endsAt,
        status: parsed.data.status,
        maxParticipants: parsed.data.maxParticipants,
        notes: parsed.data.notes,
        version: { increment: 1 },
        instructors: parsed.data.instructorIds
          ? { create: parsed.data.instructorIds.map((instructorId) => ({ instructorId })) }
          : undefined,
      },
      include: { instructors: true, product: true },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: current.organizationId,
        userId: user.id,
        action: "session.updated",
        entityType: "CourseSession",
        entityId: id,
        oldValue: { startsAt: current.startsAt, status: current.status },
        newValue: { startsAt: updated.startsAt, status: updated.status },
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleError(error);
  }
}
