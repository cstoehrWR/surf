import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { refundBooking } from "@/lib/payments/refund";
import { handleError, jsonError, requirePermission } from "@/lib/api/guard";

const schema = z.object({
  bookingId: z.string(),
  amount: z.coerce.number().positive(),
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("payments.write");
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const booking = await refundBooking({
      bookingId: parsed.data.bookingId,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      actorUserId: user.id,
    });
    return NextResponse.json({ data: booking });
  } catch (error) {
    return handleError(error);
  }
}
