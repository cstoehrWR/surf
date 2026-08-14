import { NextRequest, NextResponse } from "next/server";
import { confirmBookingPayment } from "@/lib/booking/service";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await request.text();
  if (!secret) {
    logger.warn("stripe.webhook.unconfigured");
    return NextResponse.json({ received: true, ignored: true });
  }
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
  const signature = request.headers.get("stripe-signature") ?? "";
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    logger.error("stripe.webhook.invalid", { error: String(error) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { id: string; metadata?: { bookingId?: string }; amount_total?: number };
    const bookingId = session.metadata?.bookingId;
    if (bookingId) {
      await confirmBookingPayment({
        bookingId,
        provider: "stripe",
        method: "STRIPE",
        amount: (session.amount_total ?? 0) / 100,
        reference: session.id,
      });
    }
  }
  return NextResponse.json({ received: true });
}
