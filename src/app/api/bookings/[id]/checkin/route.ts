import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requirePermission } from "@/lib/api/guard";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("checkin.perform");
    const { id } = await context.params;
    const body = await request.json();
    const participantIds: string[] = body.participantIds ?? [];
    if (!participantIds.length) return jsonError("participantIds required");

    await prisma.sessionParticipant.updateMany({
      where: { bookingId: id, participantId: { in: participantIds } },
      data: { checkedInAt: new Date(), attendance: true },
    });
    await prisma.booking.update({
      where: { id },
      data: {
        status: "CHECKED_IN",
        statusHistory: { create: { to: "CHECKED_IN", userId: user.id, reason: "checkin" } },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
