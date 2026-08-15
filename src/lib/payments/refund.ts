import { prisma } from "@/lib/db";
import { BookingError } from "@/lib/booking/service";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { getPaymentProvider } from "@/lib/payments/provider";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";
import { sendTemplatedEmail } from "@/lib/notifications/provider";

export async function refundBooking(params: {
  bookingId: string;
  amount: number;
  actorUserId?: string;
  reason?: string;
}) {
  if (params.amount <= 0) throw new BookingError("Invalid amount", "INVALID_AMOUNT");

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: params.bookingId },
    include: {
      payments: { orderBy: { createdAt: "desc" } },
      customer: true,
    },
  });

  const paid = Number(booking.amountPaid);
  const alreadyRefunded = booking.payments
    .filter((p) => p.status === PaymentStatus.REFUNDED || p.status === PaymentStatus.PARTIALLY_REFUNDED)
    .reduce((s, p) => s + Number(p.refundedAmount || 0), 0);
  const refundable = Math.round((paid - alreadyRefunded) * 100) / 100;
  if (params.amount > refundable) {
    throw new BookingError("Amount exceeds refundable", "REFUND_TOO_HIGH", { refundable });
  }

  const sourcePayment =
    booking.payments.find((p) => p.providerReference && Number(p.amount) > 0) ?? booking.payments[0];
  const provider = getPaymentProvider();
  if (sourcePayment?.providerReference && sourcePayment.provider !== "manual" && sourcePayment.provider !== "mock") {
    await provider.refund(sourcePayment.providerReference, params.amount);
  } else if (sourcePayment?.providerReference && sourcePayment.provider === "mock") {
    await provider.refund(sourcePayment.providerReference, params.amount);
  }

  const newPaid = Math.round((paid - params.amount) * 100) / 100;
  const paymentStatus =
    newPaid <= 0 ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      amountPaid: Math.max(0, newPaid),
      paymentStatus,
      payments: {
        create: {
          provider: sourcePayment?.provider ?? "manual",
          method: PaymentMethod.MANUAL,
          status: paymentStatus,
          amount: -params.amount,
          refundedAmount: params.amount,
          providerReference: sourcePayment?.providerReference
            ? `refund_${sourcePayment.providerReference}`
            : `refund_${booking.id}`,
          metadata: { reason: params.reason ?? null },
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: booking.organizationId,
      userId: params.actorUserId,
      action: "payment.refunded",
      entityType: "Booking",
      entityId: booking.id,
      newValue: { amount: params.amount, reason: params.reason ?? null },
    },
  });
  await dispatchWebhook({
    organizationId: booking.organizationId,
    event: "payment.refunded",
    payload: { bookingId: booking.id, amount: params.amount },
  });
  await sendTemplatedEmail({
    organizationId: booking.organizationId,
    to: booking.customer.email,
    templateKey: "payment.refunded",
    locale: booking.locale,
    variables: {
      "customer.firstName": booking.customer.firstName,
      "booking.number": booking.number,
      "session.date": "",
      "session.time": "",
      "location.name": "",
    },
  });
  return updated;
}
