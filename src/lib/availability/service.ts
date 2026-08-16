import { prisma } from "@/lib/db";
import { ResourceStatus, SessionStatus } from "@prisma/client";
import { addMinutes, parseTimeToMinutes, rangesOverlap } from "@/lib/utils";
import { calculatePrice } from "@/lib/pricing/engine";
import {
  computeAvailability,
  type AvailabilityInput,
  type AvailabilityResult,
} from "./engine";

export type SlotAvailability = AvailabilityResult & {
  startTime: string;
  endsAt: Date;
  startsAt: Date;
  sessionId?: string;
  price: number;
  currency: string;
  priceBreakdown?: ReturnType<typeof calculatePrice>;
};

function atTime(date: Date, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

export async function buildAvailabilityContext(params: {
  productId: string;
  locationId: string;
  date: Date;
  startTime: string;
  participants: number;
  now?: Date;
}): Promise<{
  input: AvailabilityInput;
  basePrice: number;
  taxRate: number;
  currency: string;
  durationMinutes: number;
  price: ReturnType<typeof calculatePrice>;
}> {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: params.productId },
    include: {
      variants: true,
      requirements: { include: { resourceType: true } },
      priceRules: true,
    },
  });

  const location = await prisma.location.findUniqueOrThrow({
    where: { id: params.locationId },
    include: { openingHours: true, blackouts: true },
  });

  const seasons = await prisma.season.findMany({
    where: {
      organizationId: product.organizationId,
      OR: [{ locationId: null }, { locationId: params.locationId }],
    },
  });

  const startsAt = atTime(params.date, params.startTime);
  const endsAt = addMinutes(startsAt, product.durationMinutes);

  const session = await prisma.courseSession.findFirst({
    where: {
      productId: product.id,
      locationId: params.locationId,
      startsAt,
      status: { notIn: [SessionStatus.CANCELLED] },
    },
    include: {
      instructors: true,
      participants: true,
    },
  });

  const bookedParticipants = session?.participants.length ?? 0;

  const instructors = await prisma.instructor.findMany({
    where: { organizationId: product.organizationId, active: true },
    include: {
      locations: true,
      productTypes: true,
      absences: true,
      sessions: { include: { session: true } },
    },
  });

  const resourceTypes = product.requirements.map((r) => r.resourceTypeId);
  const resources = await prisma.resource.groupBy({
    by: ["resourceTypeId"],
    where: {
      organizationId: product.organizationId,
      locationId: params.locationId,
      resourceTypeId: { in: resourceTypes },
      status: ResourceStatus.AVAILABLE,
    },
    _count: { _all: true },
  });

  const instructorViews = instructors.map((instructor) => {
    const overlapping = instructor.sessions.some((link) => {
      if (session && link.sessionId === session.id) return false;
      return rangesOverlap(startsAt, endsAt, link.session.startsAt, link.session.endsAt);
    });
    const absent = instructor.absences.some((a) => a.startsAt < endsAt && startsAt < a.endsAt);
    const weeklyMinutes = instructor.sessions.reduce((sum, link) => {
      const s = link.session;
      const sameWeek = isSameIsoWeek(s.startsAt, startsAt);
      if (!sameWeek) return sum;
      return sum + (s.endsAt.getTime() - s.startsAt.getTime()) / 60000;
    }, 0);
    return {
      id: instructor.id,
      canTeach: instructor.productTypes.some((p) => p.productType === product.type),
      availableAtLocation: instructor.locations.some((l) => l.locationId === params.locationId),
      overlapping,
      absent,
      withinWeeklyHours: weeklyMinutes / 60 + product.durationMinutes / 60 <= instructor.maxWeeklyHours,
    };
  });

  const input: AvailabilityInput = {
    product: {
      id: product.id,
      published: product.published,
      locationId: product.locationId,
      minParticipants: product.minParticipants,
      maxParticipants: product.maxParticipants,
      durationMinutes: product.durationMinutes,
      bookingLeadHours: product.bookingLeadHours,
      instructorRatio: product.instructorRatio,
      requiredInstructors: product.requiredInstructors,
      weekdays: product.weekdays,
      startTimes: product.startTimes,
      seasonStart: product.seasonStart,
      seasonEnd: product.seasonEnd,
      requirements: product.requirements.map((r) => ({
        resourceTypeId: r.resourceTypeId,
        resourceTypeName: r.resourceType.name,
        quantityPerParticipant: r.quantityPerParticipant,
        quantityPerSession: r.quantityPerSession,
        required: r.required,
      })),
    },
    locationId: params.locationId,
    date: params.date,
    startTime: params.startTime,
    requestedParticipants: params.participants,
    now: params.now ?? new Date(),
    openingHours: location.openingHours,
    blackouts: location.blackouts,
    seasons: seasons.map((s) => ({
      startsOn: s.startsOn,
      endsOn: s.endsOn,
      locationId: s.locationId,
    })),
    session: session
      ? {
          id: session.id,
          maxParticipants: session.maxParticipants,
          bookedParticipants,
          status: session.status,
          instructorIds: session.instructors.map((i) => i.instructorId),
        }
      : undefined,
    instructors: instructorViews,
    resources: resources.map((r) => ({
      resourceTypeId: r.resourceTypeId,
      availableCount: r._count._all,
    })),
  };

  const orgRules = await prisma.priceRule.findMany({
    where: {
      organizationId: product.organizationId,
      productId: null,
      active: true,
    },
  });
  const mergedRules = [...product.priceRules, ...orgRules];

  const variant = product.variants[0];
  const price = calculatePrice({
    basePrice: Number(product.basePrice),
    variantPrice: variant ? Number(variant.price) : null,
    participants: params.participants,
    date: params.date,
    now: params.now,
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

  return {
    input,
    basePrice: Number(product.basePrice),
    taxRate: Number(product.taxRate),
    currency: "EUR",
    durationMinutes: product.durationMinutes,
    price,
  };
}

export async function getAvailability(params: {
  productId: string;
  locationId: string;
  date: Date;
  participants: number;
  now?: Date;
}) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: params.productId },
  });

  const times = product.startTimes.length ? product.startTimes : ["09:00", "11:00", "14:00"];
  const slots: SlotAvailability[] = [];

  for (const startTime of times) {
    const ctx = await buildAvailabilityContext({
      ...params,
      startTime,
    });
    const result = computeAvailability(ctx.input);
    const startsAt = atTime(params.date, startTime);
    slots.push({
      ...result,
      startTime,
      startsAt,
      endsAt: addMinutes(startsAt, ctx.durationMinutes),
      sessionId: ctx.input.session?.id,
      price: ctx.price.unitPrice,
      currency: ctx.currency,
      priceBreakdown: ctx.price,
    });
  }

  return {
    productId: product.id,
    locationId: params.locationId,
    date: params.date.toLocaleDateString("en-CA"),
    participants: params.participants,
    slots,
  };
}

function isSameIsoWeek(a: Date, b: Date) {
  const ta = startOfIsoWeek(a).getTime();
  const tb = startOfIsoWeek(b).getTime();
  return ta === tb;
}

function startOfIsoWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

export { parseTimeToMinutes };
