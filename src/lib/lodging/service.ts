import { BookingMode, BookingStatus, PaymentStatus, Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { BookingError } from "@/lib/booking/service";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";
import {
  computeLodgingAvailability,
  eachNight,
  lodgingLineTotal,
  nightsCount,
} from "./availability";

function dateOnly(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function getLodgingAvailability(params: {
  productId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
}) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: params.productId },
    include: { lodgingUnits: true },
  });
  if (product.bookingMode !== BookingMode.NIGHTLY) {
    throw new BookingError("Product is not nightly lodging", "NOT_LODGING");
  }

  const nights = eachNight(params.checkIn, params.checkOut);
  const occupied = await prisma.lodgingNight.findMany({
    where: {
      unitId: { in: product.lodgingUnits.map((u) => u.id) },
      night: { in: nights },
      bookingItem: { booking: { status: { not: BookingStatus.CANCELLED } } },
    },
  });

  const result = computeLodgingAvailability({
    units: product.lodgingUnits,
    occupied,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    guests: params.guests,
  });

  const unitPrice = Number(product.basePrice);
  return {
    productId: product.id,
    checkIn: dateOnly(params.checkIn).toISOString().slice(0, 10),
    checkOut: dateOnly(params.checkOut).toISOString().slice(0, 10),
    nights: result.nights,
    freeUnits: result.freeUnits,
    available: result.available,
    unitPrice,
    lineTotal: lodgingLineTotal({
      nightlyRate: unitPrice,
      nights: result.nights,
      units: 1,
    }),
    currency: "EUR",
    reasons: result.reasons,
  };
}

export async function createLodgingBooking(params: {
  productId: string;
  locationId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  guestsDetail: Array<{ firstName: string; lastName: string }>;
  consents: { agb: boolean; privacy: boolean; participation: boolean };
}) {
  if (!params.consents.agb || !params.consents.privacy) {
    throw new BookingError("Consents required", "CONSENTS_REQUIRED");
  }
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: params.productId },
    include: { lodgingUnits: true },
  });
  if (product.bookingMode !== BookingMode.NIGHTLY) {
    throw new BookingError("Not a lodging product", "NOT_LODGING");
  }
  if (product.locationId !== params.locationId) {
    throw new BookingError("Location mismatch", "INVALID_LOCATION");
  }

  const nights = eachNight(params.checkIn, params.checkOut);
  if (nights.length < 1) throw new BookingError("Invalid stay", "INVALID_RANGE");

  return prisma.$transaction(async (tx) => {
    const occupied = await tx.lodgingNight.findMany({
      where: {
        unitId: { in: product.lodgingUnits.map((u) => u.id) },
        night: { in: nights },
        bookingItem: { booking: { status: { not: BookingStatus.CANCELLED } } },
      },
    });
    const availability = computeLodgingAvailability({
      units: product.lodgingUnits,
      occupied,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      guests: params.guests,
    });
    if (!availability.available || !availability.unitIds?.length) {
      throw new BookingError("No lodging unit available", "NOT_AVAILABLE", availability);
    }
    const unitId = availability.unitIds[0];
    const unitPrice = Number(product.basePrice);
    const lineTotal = lodgingLineTotal({ nightlyRate: unitPrice, nights: nights.length, units: 1 });
    const taxTotal =
      Math.round(lineTotal * (Number(product.taxRate) / (100 + Number(product.taxRate))) * 100) / 100;

    const existingCustomer = await tx.customer.findFirst({
      where: { organizationId: product.organizationId, email: params.customer.email.toLowerCase() },
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
            email: params.customer.email.toLowerCase(),
            firstName: params.customer.firstName,
            lastName: params.customer.lastName,
            phone: params.customer.phone,
          },
        });

    const booking = await tx.booking.create({
      data: {
        organizationId: product.organizationId,
        locationId: params.locationId,
        customerId: customer.id,
        number: `NS-${nanoid(8).toUpperCase()}`,
        accessToken: nanoid(24),
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        subtotal: lineTotal,
        taxTotal,
        total: lineTotal,
        items: {
          create: {
            productId: product.id,
            name: product.name,
            quantity: nights.length,
            unitPrice,
            taxRate: product.taxRate,
            lineTotal,
            checkIn: dateOnly(params.checkIn),
            checkOut: dateOnly(params.checkOut),
            priceBreakdown: {
              mode: "NIGHTLY",
              nights: nights.length,
              unitId,
              appliedRules: [{ type: "STANDARD", effect: unitPrice }],
            } as Prisma.InputJsonValue,
            lodgingNights: {
              create: nights.map((night) => ({
                unitId,
                night,
              })),
            },
          },
        },
        participants: {
          create: params.guestsDetail.slice(0, Math.max(1, params.guests)).map((g) => ({
            firstName: g.firstName,
            lastName: g.lastName,
          })),
        },
        statusHistory: { create: { to: BookingStatus.PENDING, reason: "lodging.created" } },
      },
      include: { items: true, customer: true },
    });

    await dispatchWebhook({
      organizationId: product.organizationId,
      event: "booking.created",
      payload: { bookingId: booking.id, mode: "NIGHTLY" },
    });

    return booking;
  });
}

export { nightsCount };
