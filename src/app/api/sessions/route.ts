import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addMinutes } from "@/lib/utils";
import { createSessionSchema } from "@/lib/validation/schemas";
import { handleError, jsonError, requirePermission } from "@/lib/api/guard";
import { SessionStatus } from "@prisma/client";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  try {
    await requirePermission("sessions.read");
  } catch {
    try {
      await requirePermission("sessions.own");
    } catch (error) {
      return handleError(error);
    }
  }
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const locationId = url.searchParams.get("locationId") ?? undefined;
  const instructorId = url.searchParams.get("instructorId") ?? undefined;

  const sessions = await prisma.courseSession.findMany({
    where: {
      locationId,
      startsAt: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
      instructors:
        session?.user.role === "INSTRUCTOR"
          ? { some: { instructor: { userId: session.user.id } } }
          : instructorId
            ? { some: { instructorId } }
            : undefined,
    },
    include: {
      product: true,
      location: true,
      instructors: { include: { instructor: true } },
      participants: { include: { participant: true, booking: true } },
    },
    orderBy: { startsAt: "asc" },
  });
  return NextResponse.json({
    data: sessions.map((s) => ({
      ...s,
      booked: s.participants.length,
      capacity: s.maxParticipants,
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission("sessions.write");
    const parsed = createSessionSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const product = await prisma.product.findUniqueOrThrow({ where: { id: parsed.data.productId } });
    const startsAt = new Date(parsed.data.startsAt);
    const session = await prisma.courseSession.create({
      data: {
        organizationId: product.organizationId,
        locationId: parsed.data.locationId,
        productId: product.id,
        startsAt,
        endsAt: addMinutes(startsAt, product.durationMinutes),
        maxParticipants: parsed.data.maxParticipants ?? product.maxParticipants,
        status: SessionStatus.PLANNED,
        notes: parsed.data.notes,
        instructors: parsed.data.instructorIds
          ? { create: parsed.data.instructorIds.map((id) => ({ instructorId: id })) }
          : undefined,
      },
    });
    return NextResponse.json({ data: session }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
