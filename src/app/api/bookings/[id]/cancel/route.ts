import { NextRequest, NextResponse } from "next/server";
import { cancelBooking } from "@/lib/booking/service";
import { handleError, requirePermission } from "@/lib/api/guard";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("bookings.write");
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const booking = await cancelBooking({
      bookingId: id,
      reason: body.reason,
      actorUserId: user.id,
    });
    return NextResponse.json({ data: booking });
  } catch (error) {
    return handleError(error);
  }
}
