export type CreatePaymentInput = {
  bookingId: string;
  bookingNumber: string;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail: string;
  description: string;
};

export type PaymentIntentResult = {
  provider: string;
  redirectUrl?: string;
  reference: string;
  mock?: boolean;
};

export interface PaymentProvider {
  name: string;
  createCheckout(input: CreatePaymentInput): Promise<PaymentIntentResult>;
  refund(reference: string, amount: number): Promise<void>;
}

export class MockPaymentProvider implements PaymentProvider {
  name = "mock";
  async createCheckout(input: CreatePaymentInput): Promise<PaymentIntentResult> {
    return {
      provider: "mock",
      reference: `mock_${input.bookingId}`,
      redirectUrl: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}mock=1`,
      mock: true,
    };
  }
  async refund(): Promise<void> {
    return;
  }
}

export class StripePaymentProvider implements PaymentProvider {
  name = "stripe";
  constructor(private secretKey: string) {}

  async createCheckout(input: CreatePaymentInput): Promise<PaymentIntentResult> {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(this.secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customerEmail,
      metadata: { bookingId: input.bookingId, bookingNumber: input.bookingNumber },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency,
            unit_amount: Math.round(input.amount * 100),
            product_data: { name: input.description },
          },
        },
      ],
    });
    return {
      provider: "stripe",
      reference: session.id,
      redirectUrl: session.url ?? undefined,
    };
  }

  async refund(reference: string, amount: number): Promise<void> {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(this.secretKey);
    const session = await stripe.checkout.sessions.retrieve(reference, {
      expand: ["payment_intent"],
    });
    const intent = session.payment_intent;
    const id = typeof intent === "string" ? intent : intent?.id;
    if (!id) throw new Error("No payment intent");
    await stripe.refunds.create({
      payment_intent: id,
      amount: Math.round(amount * 100),
    });
  }
}

export function getPaymentProvider(): PaymentProvider {
  if (process.env.STRIPE_SECRET_KEY) {
    return new StripePaymentProvider(process.env.STRIPE_SECRET_KEY);
  }
  return new MockPaymentProvider();
}
