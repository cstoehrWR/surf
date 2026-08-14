import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments/provider";
import { confirmBookingPayment } from "@/lib/booking/service";
import { openAmount } from "@/lib/portal/service";
import { handleError, jsonError, rateLimit } from "@/lib/api/guard";
import { PaymentMethod } from "@prisma/client";

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request.headers.get("x-forwarded-for") ?? "portal-pay", 20)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const { token } = await context.params;
    const booking = await prisma.booking.findUnique({
      where: { accessToken: token },
      include: { customer: true },
    });
    if (!booking) return jsonError("Not found", 404);
    const due = openAmount(booking);
    if (due <= 0) return jsonError("Nothing to pay", 400);

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const provider = getPaymentProvider();
    const checkout = await provider.createCheckout({
      bookingId: booking.id,
      bookingNumber: booking.number,
      amount: due,
      currency: (process.env.PAYMENTS_CURRENCY ?? "eur").toLowerCase(),
      customerEmail: booking.customer.email,
      description: `Restzahlung ${booking.number}`,
      successUrl: `${appUrl}/portal/${token}?paid=1`,
      cancelUrl: `${appUrl}/portal/${token}?cancelled=1`,
    });

    if (checkout.mock) {
      await confirmBookingPayment({
        bookingId: booking.id,
        provider: "mock",
        method: PaymentMethod.STRIPE,
        amount: due,
        reference: checkout.reference,
      });
    }

    return NextResponse.json({ data: checkout });
  } catch (error) {
    return handleError(error);
  }
}
