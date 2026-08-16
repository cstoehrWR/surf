import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { patchBookingSchema } from "@/lib/validation/schemas";
import { handleError, jsonError, requirePermission, requireUser } from "@/lib/api/guard";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = new URL(request.url).searchParams.get("token");
  const booking = await prisma.booking.findFirst({
    where: { OR: [{ id }, { number: id }] },
    include: {
      customer: true,
      items: { include: { session: true, product: true } },
      participants: { include: { sessions: true, waivers: true } },
      payments: true,
      statusHistory: true,
    },
  });
  if (!booking) return jsonError("Not found", 404);
  if (token && token !== booking.accessToken) return jsonError("Forbidden", 403);
  if (!token) {
    try {
      await requireUser();
    } catch {
      return jsonError("Unauthorized", 401);
    }
  }
  return NextResponse.json({
    data: {
      ...booking,
      total: Number(booking.total),
      subtotal: Number(booking.subtotal),
      amountPaid: Number(booking.amountPaid),
    },
  });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("bookings.write");
    const { id } = await context.params;
    const parsed = patchBookingSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const current = await prisma.booking.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...parsed.data,
        statusHistory: parsed.data.status
          ? { create: { from: current.status, to: parsed.data.status, reason: "patch" } }
          : undefined,
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: current.organizationId,
        action: "booking.updated",
        entityType: "Booking",
        entityId: id,
        oldValue: { status: current.status },
        newValue: parsed.data,
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleError(error);
  }
}
