import { prisma } from "@/lib/db";
import { BookingStatus } from "@prisma/client";
import { cancelBooking as cancelBookingCore, BookingError } from "@/lib/booking/service";
import { sendTemplatedEmail } from "@/lib/notifications/provider";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";

export async function getPortalBooking(token: string) {
  const booking = await prisma.booking.findUnique({
    where: { accessToken: token },
    include: {
      customer: true,
      location: true,
      items: {
        include: {
          product: true,
          session: { include: { product: true, location: true } },
        },
      },
      participants: { include: { waivers: { include: { template: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      invoices: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  });
  return booking;
}

export function openAmount(booking: { total: unknown; amountPaid: unknown }) {
  return Math.max(0, Math.round((Number(booking.total) - Number(booking.amountPaid)) * 100) / 100);
}

export async function getCancellationInfo(bookingId: string) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      items: { include: { session: true, product: true } },
    },
  });
  const sessionItem = booking.items.find((i) => i.session);
  const session = sessionItem?.session;
  const product = sessionItem?.product;
  const hours = product?.cancellationHours ?? 24;
  const deadline = session
    ? new Date(session.startsAt.getTime() - hours * 60 * 60 * 1000)
    : null;
  const allowed =
    booking.status !== BookingStatus.CANCELLED &&
    booking.status !== BookingStatus.COMPLETED &&
    booking.status !== BookingStatus.CHECKED_IN &&
    Boolean(deadline && Date.now() < deadline.getTime());

  return {
    allowed,
    hours,
    deadline,
    startsAt: session?.startsAt ?? null,
    reason: !allowed
      ? booking.status === BookingStatus.CANCELLED
        ? "already_cancelled"
        : !session
          ? "no_session"
          : "deadline_passed"
      : null,
  };
}

export async function cancelViaPortal(params: {
  token: string;
  reason?: string;
}) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { accessToken: params.token },
    include: { customer: true, items: { include: { session: true } } },
  });
  const info = await getCancellationInfo(booking.id);
  if (!info.allowed) {
    throw new BookingError("Cancellation not allowed", "CANCEL_NOT_ALLOWED", info);
  }
  const updated = await cancelBookingCore({
    bookingId: booking.id,
    reason: params.reason ?? "customer_portal",
  });
  const session = booking.items.find((i) => i.session)?.session;
  await sendTemplatedEmail({
    organizationId: booking.organizationId,
    to: booking.customer.email,
    templateKey: "booking.cancelled",
    locale: booking.locale,
    variables: {
      "customer.firstName": booking.customer.firstName,
      "booking.number": booking.number,
      "session.date": session ? session.startsAt.toLocaleDateString("de-DE") : "",
      "session.time": session
        ? session.startsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
        : "",
      "location.name": "",
    },
  });
  return updated;
}

export async function updatePortalParticipant(params: {
  token: string;
  participantId: string;
  data: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string | null;
    age?: number | null;
    heightCm?: number | null;
    weightKg?: number | null;
    surfLevel?: "NONE" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PRO";
    wetsuitSize?: string | null;
    shoeSize?: string | null;
    canSwim?: boolean;
    notes?: string | null;
  };
}) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { accessToken: params.token },
  });
  if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
    throw new BookingError("Booking locked", "BOOKING_LOCKED");
  }
  const participant = await prisma.participant.findFirst({
    where: { id: params.participantId, bookingId: booking.id },
  });
  if (!participant) throw new BookingError("Participant not found", "NOT_FOUND");

  const updated = await prisma.participant.update({
    where: { id: participant.id },
    data: {
      firstName: params.data.firstName,
      lastName: params.data.lastName,
      dateOfBirth: params.data.dateOfBirth ? new Date(params.data.dateOfBirth) : params.data.dateOfBirth === null ? null : undefined,
      age: params.data.age,
      heightCm: params.data.heightCm,
      weightKg: params.data.weightKg,
      surfLevel: params.data.surfLevel,
      wetsuitSize: params.data.wetsuitSize,
      shoeSize: params.data.shoeSize,
      canSwim: params.data.canSwim,
      notes: params.data.notes,
    },
  });
  await dispatchWebhook({
    organizationId: booking.organizationId,
    event: "participant.updated",
    payload: { bookingId: booking.id, participantId: updated.id },
  });
  return updated;
}
