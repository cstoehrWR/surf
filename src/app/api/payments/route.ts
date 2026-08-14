import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPaymentSchema } from "@/lib/validation/schemas";
import { getPaymentProvider } from "@/lib/payments/provider";
import { confirmBookingPayment } from "@/lib/booking/service";
import { handleError, jsonError, rateLimit } from "@/lib/api/guard";
import { PaymentMethod } from "@prisma/client";

export async function POST(request: NextRequest) {
  if (!rateLimit(request.headers.get("x-forwarded-for") ?? "pay", 30)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const parsed = createPaymentSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: parsed.data.bookingId },
      include: { customer: true },
    });
    const amount = parsed.data.amount ?? Number(booking.total) - Number(booking.amountPaid);
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";

    if (parsed.data.method === "CASH" || parsed.data.method === "MANUAL") {
      const updated = await confirmBookingPayment({
        bookingId: booking.id,
        provider: "manual",
        method: parsed.data.method as PaymentMethod,
        amount,
        reference: `manual_${booking.id}`,
      });
      return NextResponse.json({ data: { booking: updated, redirectUrl: `${appUrl}/book/confirmation/${booking.number}` } });
    }

    const provider = getPaymentProvider();
    const checkout = await provider.createCheckout({
      bookingId: booking.id,
      bookingNumber: booking.number,
      amount,
      currency: (process.env.PAYMENTS_CURRENCY ?? "eur").toLowerCase(),
      customerEmail: booking.customer.email,
      description: `Buchung ${booking.number}`,
      successUrl: `${appUrl}/book/confirmation/${booking.number}?paid=1`,
      cancelUrl: `${appUrl}/book/pay/${booking.id}?cancelled=1`,
    });

    if (checkout.mock) {
      await confirmBookingPayment({
        bookingId: booking.id,
        provider: "mock",
        method: PaymentMethod.STRIPE,
        amount,
        reference: checkout.reference,
      });
    } else {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          provider: checkout.provider,
          method: PaymentMethod.STRIPE,
          status: "UNPAID",
          amount,
          providerReference: checkout.reference,
        },
      });
    }

    return NextResponse.json({ data: checkout });
  } catch (error) {
    return handleError(error);
  }
}
