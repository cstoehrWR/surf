import { prisma } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";
import { sendTemplatedEmail } from "@/lib/notifications/provider";
import { BookingError } from "@/lib/booking/service";
import { shouldPromoteWaitlist } from "./logic";

const HOLD_HOURS = 24;

export async function joinWaitlist(params: {
  organizationId: string;
  sessionId: string;
  email: string;
  firstName: string;
  lastName: string;
  participants?: number;
  customerId?: string;
}) {
  const session = await prisma.courseSession.findUniqueOrThrow({
    where: { id: params.sessionId },
    include: { participants: true, product: true },
  });
  if (session.organizationId !== params.organizationId) {
    throw new BookingError("Session mismatch", "INVALID_SESSION");
  }

  const existing = await prisma.waitlistEntry.findFirst({
    where: {
      sessionId: params.sessionId,
      email: params.email.toLowerCase(),
    },
  });
  if (existing) return existing;

  const entry = await prisma.waitlistEntry.create({
    data: {
      organizationId: params.organizationId,
      sessionId: params.sessionId,
      email: params.email.toLowerCase(),
      firstName: params.firstName,
      lastName: params.lastName,
      participants: params.participants ?? 1,
      customerId: params.customerId,
    },
  });

  await dispatchWebhook({
    organizationId: params.organizationId,
    event: "waitlist.joined",
    payload: {
      entryId: entry.id,
      sessionId: session.id,
      product: session.product.name,
      email: entry.email,
    },
  });

  return entry;
}

export async function listWaitlist(params: { organizationId: string; sessionId?: string }) {
  return prisma.waitlistEntry.findMany({
    where: {
      organizationId: params.organizationId,
      sessionId: params.sessionId,
    },
    include: {
      session: { include: { product: true, location: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function freeCapacityForSession(sessionId: string) {
  const session = await prisma.courseSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { participants: true },
  });
  return Math.max(0, session.maxParticipants - session.participants.length);
}

/** Notify the oldest waiting guest when capacity frees up; holds seat for HOLD_HOURS. */
export async function promoteNextWaitlistEntry(sessionId: string) {
  const free = await freeCapacityForSession(sessionId);
  if (free <= 0) return null;

  const now = new Date();
  const held = await prisma.waitlistEntry.findFirst({
    where: {
      sessionId,
      holdUntil: { gt: now },
      notifiedAt: { not: null },
    },
  });
  if (held) return held;

  const next = await prisma.waitlistEntry.findFirst({
    where: {
      sessionId,
      OR: [{ notifiedAt: null }, { holdUntil: { lt: now } }],
    },
    orderBy: { createdAt: "asc" },
    include: { session: { include: { product: true, location: true } } },
  });
  if (!next) return null;
  if (
    !shouldPromoteWaitlist({
      freeSlots: free,
      entryParticipants: next.participants,
      hasActiveHold: false,
    })
  ) {
    return null;
  }

  const holdUntil = new Date(now.getTime() + HOLD_HOURS * 60 * 60 * 1000);
  const updated = await prisma.waitlistEntry.update({
    where: { id: next.id },
    data: { notifiedAt: now, holdUntil },
    include: { session: { include: { product: true, location: true } } },
  });

  await sendTemplatedEmail({
    organizationId: updated.organizationId,
    to: updated.email,
    templateKey: "waitlist.promoted",
    variables: {
      "customer.firstName": updated.firstName,
      productName: updated.session.product.name,
      startsAt: updated.session.startsAt.toLocaleString("de-DE"),
      holdHours: String(HOLD_HOURS),
    },
  });

  await dispatchWebhook({
    organizationId: updated.organizationId,
    event: "waitlist.promoted",
    payload: {
      entryId: updated.id,
      sessionId,
      email: updated.email,
      holdUntil: holdUntil.toISOString(),
    },
  });

  return updated;
}

export async function promoteWaitlistAfterCancellation(bookingId: string) {
  const items = await prisma.bookingItem.findMany({
    where: { bookingId, sessionId: { not: null } },
    select: { sessionId: true },
  });
  const sessionIds = [...new Set(items.map((i) => i.sessionId!).filter(Boolean))];
  const promoted = [];
  for (const sessionId of sessionIds) {
    const entry = await promoteNextWaitlistEntry(sessionId);
    if (entry) promoted.push(entry);
  }
  return promoted;
}

export async function removeWaitlistEntry(id: string) {
  return prisma.waitlistEntry.delete({ where: { id } });
}

export { HOLD_HOURS };
