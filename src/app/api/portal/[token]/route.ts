import { NextRequest, NextResponse } from "next/server";
import { getPortalBooking, openAmount, getCancellationInfo } from "@/lib/portal/service";
import { getRequiredWaivers } from "@/lib/waiver/service";
import { jsonError } from "@/lib/api/guard";

export async function GET(_: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const booking = await getPortalBooking(token);
  if (!booking) return jsonError("Not found", 404);
  const cancellation = await getCancellationInfo(booking.id);
  const waivers = await getRequiredWaivers(token);
  return NextResponse.json({
    data: {
      ...booking,
      total: Number(booking.total),
      subtotal: Number(booking.subtotal),
      taxTotal: Number(booking.taxTotal),
      amountPaid: Number(booking.amountPaid),
      openAmount: openAmount(booking),
      cancellation,
      waivers,
    },
  });
}
