import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addMinutes } from "@/lib/utils";
import { patchSessionSchema } from "@/lib/validation/schemas";
import { handleError, jsonError, requirePermission } from "@/lib/api/guard";
import { sendTemplatedEmail } from "@/lib/notifications/provider";

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
      include: {
        product: true,
        location: true,
        instructors: true,
        participants: { include: { booking: { include: { customer: true } } } },
      },
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

    let notified = 0;
    const shouldNotify =
      parsed.data.notify &&
      parsed.data.status &&
      parsed.data.status !== current.status &&
      (parsed.data.status === "CANCELLED" ||
        parsed.data.status === "POSTPONED" ||
        parsed.data.status === "WEATHER_CHECK");

    if (shouldNotify) {
      const templateKey =
        parsed.data.status === "CANCELLED"
          ? "session.cancelled"
          : parsed.data.status === "POSTPONED"
            ? "session.postponed"
            : "session.weather_check";
      const appUrl = process.env.APP_URL ?? "http://localhost:3000";
      const seen = new Set<string>();
      for (const link of current.participants) {
        const email = link.booking.customer.email;
        if (seen.has(email)) continue;
        seen.add(email);
        await sendTemplatedEmail({
          organizationId: current.organizationId,
          to: email,
          templateKey,
          locale: link.booking.locale,
          variables: {
            "customer.firstName": link.booking.customer.firstName,
            "booking.number": link.booking.number,
            "session.date": updated.startsAt.toLocaleDateString("de-DE"),
            "session.time": updated.startsAt.toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            "location.name": current.location.name,
            "product.name": current.product.name,
            "portal.url": `${appUrl}/portal/${link.booking.accessToken}`,
          },
        }).catch(() => null);
        notified += 1;
      }
    }

    return NextResponse.json({ data: { ...updated, notified } });
  } catch (error) {
    return handleError(error);
  }
}
