export type ResourceRequirement = {
  resourceTypeId: string;
  resourceTypeName: string;
  quantityPerParticipant: number;
  quantityPerSession: number;
  required: boolean;
};

export type AvailabilityInput = {
  product: {
    id: string;
    published: boolean;
    locationId: string;
    minParticipants: number;
    maxParticipants: number;
    durationMinutes: number;
    bookingLeadHours: number;
    instructorRatio: number;
    requiredInstructors: number;
    weekdays: number[];
    startTimes: string[];
    seasonStart: Date | null;
    seasonEnd: Date | null;
    requirements: ResourceRequirement[];
  };
  locationId: string;
  date: Date;
  startTime: string;
  requestedParticipants: number;
  now: Date;
  openingHours: Array<{ weekday: number; openTime: string; closeTime: string }>;
  blackouts: Array<{ startsAt: Date; endsAt: Date }>;
  session?: {
    id: string;
    maxParticipants: number;
    bookedParticipants: number;
    status: string;
    instructorIds: string[];
  };
  instructors: Array<{
    id: string;
    canTeach: boolean;
    availableAtLocation: boolean;
    overlapping: boolean;
    absent: boolean;
    withinWeeklyHours: boolean;
  }>;
  resources: Array<{
    resourceTypeId: string;
    availableCount: number;
  }>;
};

export type MissingResource = {
  resourceTypeId: string;
  resourceTypeName: string;
  required: number;
  available: number;
};

export type AvailabilityResult = {
  available: boolean;
  availableSlots: number;
  sessionCapacity: number;
  instructorCapacity: number;
  resourceCapacities: Record<string, number>;
  missingResources: MissingResource[];
  reasons: string[];
  warnings: string[];
};

function parseMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function dateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function resourceCapacityFor(
  availableCount: number,
  quantityPerParticipant: number,
  quantityPerSession: number,
) {
  const remaining = availableCount - quantityPerSession;
  if (remaining < 0) return 0;
  if (quantityPerParticipant <= 0) return Number.POSITIVE_INFINITY;
  return Math.floor(remaining / quantityPerParticipant);
}

export function computeAvailability(input: AvailabilityInput): AvailabilityResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const { product } = input;

  if (!product.published) reasons.push("product_unpublished");
  if (product.locationId !== input.locationId) reasons.push("location_mismatch");

  const weekday = input.date.getDay();
  if (product.weekdays.length > 0 && !product.weekdays.includes(weekday)) {
    reasons.push("weekday_not_offered");
  }
  if (product.startTimes.length > 0 && !product.startTimes.includes(input.startTime)) {
    reasons.push("start_time_not_offered");
  }

  const day = dateOnly(input.date);
  if (product.seasonStart && day < dateOnly(product.seasonStart)) reasons.push("outside_season");
  if (product.seasonEnd && day > dateOnly(product.seasonEnd)) reasons.push("outside_season");

  const hours = input.openingHours.find((h) => h.weekday === weekday);
  if (!hours) {
    reasons.push("location_closed");
  } else {
    const start = parseMinutes(input.startTime);
    const end = start + product.durationMinutes;
    if (start < parseMinutes(hours.openTime) || end > parseMinutes(hours.closeTime)) {
      reasons.push("outside_opening_hours");
    }
  }

  const slotStart = new Date(input.date);
  const [hh, mm] = input.startTime.split(":").map(Number);
  slotStart.setHours(hh, mm, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + product.durationMinutes * 60_000);

  for (const blackout of input.blackouts) {
    if (slotStart < blackout.endsAt && blackout.startsAt < slotEnd) {
      reasons.push("blackout");
      break;
    }
  }

  const leadMs = product.bookingLeadHours * 60 * 60 * 1000;
  if (slotStart.getTime() - input.now.getTime() < leadMs) {
    reasons.push("lead_time");
  }

  if (input.session && ["CANCELLED", "COMPLETED"].includes(input.session.status)) {
    reasons.push("session_not_bookable");
  }

  const sessionCapacity = input.session
    ? Math.max(0, input.session.maxParticipants - input.session.bookedParticipants)
    : product.maxParticipants;

  const eligibleInstructors = input.instructors.filter(
    (i) =>
      i.canTeach &&
      i.availableAtLocation &&
      !i.overlapping &&
      !i.absent &&
      i.withinWeeklyHours,
  );
  const overlappingInstructors = input.instructors.filter((i) => i.overlapping);
  if (overlappingInstructors.length > 0) {
    warnings.push("instructor_double_booking");
  }

  const instructorSeats =
    eligibleInstructors.length * Math.max(1, product.instructorRatio);
  const minInstructorSeats = product.requiredInstructors > 0 ? 1 : instructorSeats;
  const instructorCapacity =
    eligibleInstructors.length >= product.requiredInstructors
      ? instructorSeats
      : 0;
  if (instructorCapacity <= 0 && product.requiredInstructors > 0) {
    reasons.push("no_instructor");
  }

  const resourceCapacities: Record<string, number> = {};
  const missingResources: MissingResource[] = [];

  for (const req of product.requirements) {
    const stock = input.resources.find((r) => r.resourceTypeId === req.resourceTypeId);
    const availableCount = stock?.availableCount ?? 0;
    const cap = resourceCapacityFor(
      availableCount,
      req.quantityPerParticipant,
      req.quantityPerSession,
    );
    resourceCapacities[req.resourceTypeId] = Number.isFinite(cap) ? cap : sessionCapacity;
    const needed =
      req.quantityPerSession + req.quantityPerParticipant * input.requestedParticipants;
    if (req.required && availableCount < needed) {
      missingResources.push({
        resourceTypeId: req.resourceTypeId,
        resourceTypeName: req.resourceTypeName,
        required: needed,
        available: availableCount,
      });
    }
  }

  const requiredResourceCaps = product.requirements
    .filter((r) => r.required)
    .map((r) => resourceCapacities[r.resourceTypeId] ?? 0);

  const availableSlots = Math.min(
    sessionCapacity,
    instructorCapacity || minInstructorSeats,
    ...(requiredResourceCaps.length ? requiredResourceCaps : [sessionCapacity]),
  );

  if (input.requestedParticipants > product.maxParticipants) {
    reasons.push("exceeds_product_max");
  }
  if (input.requestedParticipants > availableSlots) {
    reasons.push("insufficient_capacity");
  }
  if (missingResources.length > 0) {
    reasons.push("missing_resources");
  }

  const uniqueReasons = [...new Set(reasons)];

  return {
    available:
      uniqueReasons.length === 0 &&
      availableSlots >= Math.max(input.requestedParticipants, product.minParticipants > 0 ? 1 : 0),
    availableSlots: Math.max(0, availableSlots),
    sessionCapacity,
    instructorCapacity,
    resourceCapacities,
    missingResources,
    reasons: uniqueReasons,
    warnings: [...new Set(warnings)],
  };
}

export function effectiveCapacityExample() {
  return computeAvailability({
    product: {
      id: "p1",
      published: true,
      locationId: "nordstrand",
      minParticipants: 1,
      maxParticipants: 8,
      durationMinutes: 120,
      bookingLeadHours: 0,
      instructorRatio: 8,
      requiredInstructors: 1,
      weekdays: [5],
      startTimes: ["10:00"],
      seasonStart: null,
      seasonEnd: null,
      requirements: [
        {
          resourceTypeId: "board",
          resourceTypeName: "Surfboard",
          quantityPerParticipant: 1,
          quantityPerSession: 0,
          required: true,
        },
        {
          resourceTypeId: "wetsuit",
          resourceTypeName: "Neopren",
          quantityPerParticipant: 1,
          quantityPerSession: 0,
          required: true,
        },
      ],
    },
    locationId: "nordstrand",
    date: new Date(2026, 7, 14),
    startTime: "10:00",
    requestedParticipants: 6,
    now: new Date(2026, 7, 13),
    openingHours: [{ weekday: 5, openTime: "08:00", closeTime: "18:00" }],
    blackouts: [],
    session: {
      id: "s1",
      maxParticipants: 8,
      bookedParticipants: 0,
      status: "PLANNED",
      instructorIds: ["tom"],
    },
    instructors: [
      {
        id: "tom",
        canTeach: true,
        availableAtLocation: true,
        overlapping: false,
        absent: false,
        withinWeeklyHours: true,
      },
    ],
    resources: [
      { resourceTypeId: "board", availableCount: 6 },
      { resourceTypeId: "wetsuit", availableCount: 10 },
    ],
  });
}
