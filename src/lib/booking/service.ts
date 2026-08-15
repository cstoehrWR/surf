import { Prisma, BookingStatus, PaymentMethod, PaymentStatus, SessionStatus } from "@prisma/client";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { addMinutes } from "@/lib/utils";
import { buildAvailabilityContext } from "@/lib/availability/service";
import { computeAvailability } from "@/lib/availability/engine";
import { calculatePrice } from "@/lib/pricing/engine";
import { sendTemplatedEmail } from "@/lib/notifications/provider";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";

export class BookingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

function bookingNumber() {
  const d = new Date();
  const y = d.getFullYear();
  return `NSS-${y}-${nanoid(6).toUpperCase()}`;
}

export async function createBooking(params: {
  productId: string;
  variantId?: string;
  locationId: string;
  date: Date;
  startTime: string;
  participants: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    age?: number;
    heightCm?: number;
    weightKg?: number;
    surfLevel?: "NONE" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PRO";
    wetsuitSize?: string;
    shoeSize?: string;
    canSwim?: boolean;
    notes?: string;
  }>;
  addOnProductIds?: string[];
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  consents: { agb: boolean; privacy: boolean; participation: boolean };
  source?: string;
  overrideReason?: string;
  actorUserId?: string;
  ip?: string;
  locale?: string;
}) {
  if (!params.consents.agb || !params.consents.privacy || !params.consents.participation) {
    throw new BookingError("Consents required", "CONSENTS_REQUIRED");
  }
  if (params.participants.length < 1) {
    throw new BookingError("At least one participant required", "NO_PARTICIPANTS");
  }

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: params.productId },
    include: { variants: true, priceRules: true, location: true },
  });
  const orgRules = await prisma.priceRule.findMany({
    where: {
      organizationId: product.organizationId,
      productId: null,
      active: true,
    },
  });
  const mergedRules = [...product.priceRules, ...orgRules];

  const count = params.participants.length;

  return prisma.$transaction(async (tx) => {
    const ctx = await buildAvailabilityContext({
      productId: params.productId,
      locationId: params.locationId,
      date: params.date,
      startTime: params.startTime,
      participants: count,
    });
    const availability = computeAvailability(ctx.input);

    if (!availability.available) {
      if (!params.overrideReason) {
        throw new BookingError("Not available", "NOT_AVAILABLE", availability);
      }
    }

    const [hh, mm] = params.startTime.split(":").map(Number);
    const startsAt = new Date(params.date);
    startsAt.setHours(hh, mm, 0, 0);
    const endsAt = addMinutes(startsAt, product.durationMinutes);

    let sessionId = ctx.input.session?.id;
    if (sessionId) {
      const locked = await tx.courseSession.update({
        where: { id: sessionId },
        data: { version: { increment: 1 } },
      });
      const booked = await tx.sessionParticipant.count({ where: { sessionId } });
      if (!params.overrideReason && booked + count > locked.maxParticipants) {
        throw new BookingError("Session just filled", "RACE_CAPACITY");
      }
    } else {
      const eligible = ctx.input.instructors.find(
        (i) => i.canTeach && i.availableAtLocation && !i.overlapping && !i.absent,
      );
      const created = await tx.courseSession.create({
        data: {
          organizationId: product.organizationId,
          locationId: params.locationId,
          productId: product.id,
          startsAt,
          endsAt,
          maxParticipants: product.maxParticipants,
          status: SessionStatus.PLANNED,
          instructors: eligible ? { create: { instructorId: eligible.id } } : undefined,
        },
      });
      sessionId = created.id;
    }

    const variant = params.variantId
      ? product.variants.find((v) => v.id === params.variantId)
      : product.variants[0];

    const price = calculatePrice({
      basePrice: Number(product.basePrice),
      variantPrice: variant ? Number(variant.price) : null,
      participants: count,
      date: params.date,
      rules: mergedRules.map((r) => ({
        type: r.type,
        name: r.name,
        priority: r.priority,
        amount: r.amount ? Number(r.amount) : null,
        percent: r.percent ? Number(r.percent) : null,
        weekday: r.weekday,
        minParticipants: r.minParticipants,
        maxParticipants: r.maxParticipants,
        validFrom: r.validFrom,
        validTo: r.validTo,
        active: r.active,
      })),
    });

    let addOnTotal = 0;
    const addOnLines: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPrice: Prisma.Decimal | number;
      taxRate: Prisma.Decimal | number;
      lineTotal: number;
      priceBreakdown: Prisma.InputJsonValue;
    }> = [];
    for (const addOnId of params.addOnProductIds ?? []) {
      const addOn = await tx.product.findUniqueOrThrow({ where: { id: addOnId } });
      const line = Number(addOn.basePrice) * count;
      addOnTotal += line;
      addOnLines.push({
        productId: addOn.id,
        name: addOn.name,
        quantity: count,
        unitPrice: addOn.basePrice,
        taxRate: addOn.taxRate,
        lineTotal: line,
        priceBreakdown: { appliedRules: [{ type: "STANDARD", effect: Number(addOn.basePrice) }] },
      });
    }

    const subtotal = price.lineTotal + addOnTotal;
    const taxTotal = Math.round(subtotal * (Number(product.taxRate) / (100 + Number(product.taxRate))) * 100) / 100;

    const existingCustomer = await tx.customer.findFirst({
      where: { organizationId: product.organizationId, email: params.customer.email },
    });
    const customer = existingCustomer
      ? await tx.customer.update({
          where: { id: existingCustomer.id },
          data: {
            firstName: params.customer.firstName,
            lastName: params.customer.lastName,
            phone: params.customer.phone,
          },
        })
      : await tx.customer.create({
          data: {
            organizationId: product.organizationId,
            firstName: params.customer.firstName,
            lastName: params.customer.lastName,
            email: params.customer.email,
            phone: params.customer.phone,
            locale: params.locale ?? "de",
          },
        });

    const booking = await tx.booking.create({
      data: {
        organizationId: product.organizationId,
        locationId: params.locationId,
        customerId: customer.id,
        number: bookingNumber(),
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        source: params.source ?? "online",
        accessToken: nanoid(32),
        subtotal,
        taxTotal,
        total: subtotal,
        overrideReason: params.overrideReason,
        locale: params.locale ?? "de",
        participants: {
          create: params.participants.map((p) => ({
            firstName: p.firstName,
            lastName: p.lastName,
            dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : undefined,
            age: p.age,
            heightCm: p.heightCm,
            weightKg: p.weightKg,
            surfLevel: p.surfLevel ?? "BEGINNER",
            wetsuitSize: p.wetsuitSize,
            shoeSize: p.shoeSize,
            canSwim: p.canSwim ?? true,
            notes: p.notes,
          })),
        },
        statusHistory: {
          create: { to: BookingStatus.PENDING, reason: "created", userId: params.actorUserId },
        },
      },
      include: { participants: true, customer: true },
    });

    await tx.bookingItem.create({
      data: {
        bookingId: booking.id,
        productId: product.id,
        variantId: variant?.id,
        sessionId,
        name: `${product.name}${variant ? ` – ${variant.name}` : ""}`,
        quantity: count,
        unitPrice: price.unitPrice,
        taxRate: product.taxRate,
        lineTotal: price.lineTotal,
        priceBreakdown: price as unknown as Prisma.InputJsonValue,
      },
    });
    for (const line of addOnLines) {
      await tx.bookingItem.create({
        data: {
          bookingId: booking.id,
          productId: line.productId,
          name: line.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          lineTotal: line.lineTotal,
          priceBreakdown: line.priceBreakdown,
        },
      });
    }

    await tx.consent.createMany({
      data: [
        { customerId: customer.id, type: "agb", accepted: true, ip: params.ip },
        { customerId: customer.id, type: "privacy", accepted: true, ip: params.ip },
        { customerId: customer.id, type: "participation", accepted: true, ip: params.ip },
      ],
    });

    await tx.sessionParticipant.createMany({
      data: booking.participants.map((p) => ({
        sessionId: sessionId!,
        participantId: p.id,
        bookingId: booking.id,
      })),
    });

    if (params.overrideReason) {
      await tx.auditLog.create({
        data: {
          organizationId: product.organizationId,
          userId: params.actorUserId,
          action: "booking.override",
          entityType: "Booking",
          entityId: booking.id,
          newValue: { reason: params.overrideReason, availability },
          ip: params.ip,
        },
      });
    }

    logger.info("booking.created", { bookingId: booking.id, number: booking.number });
    return tx.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: { participants: true, items: true, customer: true },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function confirmBookingPayment(params: {
  bookingId: string;
  provider: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
}) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: params.bookingId },
    include: { customer: true, items: { include: { session: { include: { product: true, location: true } } } } },
  });

  const amountPaid = Number(booking.amountPaid) + params.amount;
  const total = Number(booking.total);
  let paymentStatus: PaymentStatus = PaymentStatus.PARTIALLY_PAID;
  if (amountPaid >= total) paymentStatus = PaymentStatus.PAID;
  if (params.amount <= 0) paymentStatus = PaymentStatus.FAILED;

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      amountPaid,
      paymentStatus,
      status: paymentStatus === PaymentStatus.PAID || paymentStatus === PaymentStatus.PARTIALLY_PAID
        ? BookingStatus.CONFIRMED
        : booking.status,
      payments: {
        create: {
          provider: params.provider,
          method: params.method,
          status: paymentStatus,
          amount: params.amount,
          providerReference: params.reference,
        },
      },
      statusHistory: {
        create: {
          from: booking.status,
          to: BookingStatus.CONFIRMED,
          reason: "payment",
        },
      },
    },
    include: { customer: true, items: { include: { session: true } } },
  });

  const session = updated.items.find((i) => i.session)?.session;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const location = await prisma.location.findUnique({ where: { id: booking.locationId } });
  await sendTemplatedEmail({
    organizationId: booking.organizationId,
    to: booking.customer.email,
    templateKey: "booking.confirmed",
    locale: booking.locale,
    variables: {
      "customer.firstName": booking.customer.firstName,
      "booking.number": booking.number,
      "session.date": session ? session.startsAt.toLocaleDateString("de-DE") : "",
      "session.time": session
        ? session.startsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
        : "",
      "location.name": location?.name ?? "",
      "portal.url": `${appUrl}/portal/${booking.accessToken}`,
    },
  });
  await dispatchWebhook({
    organizationId: booking.organizationId,
    event: "booking.confirmed",
    payload: { bookingId: booking.id, number: booking.number },
  });
  await dispatchWebhook({
    organizationId: booking.organizationId,
    event: "payment.received",
    payload: { bookingId: booking.id, amount: params.amount },
  });
  return updated;
}

export async function cancelBooking(params: {
  bookingId: string;
  reason?: string;
  actorUserId?: string;
}) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: params.bookingId },
    include: { items: true },
  });
  if (booking.status === BookingStatus.CANCELLED) return booking;

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BookingStatus.CANCELLED,
      statusHistory: {
        create: {
          from: booking.status,
          to: BookingStatus.CANCELLED,
          reason: params.reason,
          userId: params.actorUserId,
        },
      },
    },
  });

  await prisma.sessionParticipant.deleteMany({ where: { bookingId: booking.id } });
  await prisma.lodgingNight.deleteMany({
    where: { bookingItem: { bookingId: booking.id } },
  });
  await prisma.auditLog.create({
    data: {
      organizationId: booking.organizationId,
      userId: params.actorUserId,
      action: "booking.cancelled",
      entityType: "Booking",
      entityId: booking.id,
      oldValue: { status: booking.status },
      newValue: { status: "CANCELLED", reason: params.reason },
    },
  });
  await dispatchWebhook({
    organizationId: booking.organizationId,
    event: "booking.cancelled",
    payload: { bookingId: booking.id },
  });

  const { promoteWaitlistAfterCancellation } = await import("@/lib/waitlist/service");
  await promoteWaitlistAfterCancellation(booking.id);

  return updated;
}
