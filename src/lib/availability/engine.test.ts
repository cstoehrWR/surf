import { computeAvailability } from "./engine";

describe("Availability Engine", () => {
  const friday = new Date(2026, 7, 14);
  const now = new Date(2026, 7, 13, 12, 0, 0);

  const baseProduct = {
    id: "p1",
    published: true,
    locationId: "nordstrand",
    minParticipants: 1,
    maxParticipants: 8,
    durationMinutes: 120,
    bookingLeadHours: 2,
    instructorRatio: 8,
    requiredInstructors: 1,
    weekdays: [5],
    startTimes: ["10:00"],
    seasonStart: null as Date | null,
    seasonEnd: null as Date | null,
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
        resourceTypeName: "Neoprenanzug",
        quantityPerParticipant: 1,
        quantityPerSession: 0,
        required: true,
      },
    ],
  };

  const instructors = [
    {
      id: "tom",
      canTeach: true,
      availableAtLocation: true,
      overlapping: false,
      absent: false,
      withinWeeklyHours: true,
    },
  ];

  it("uses the minimum of session, instructor and resource capacity (6 boards => 6 seats)", () => {
    const result = computeAvailability({
      product: baseProduct,
      locationId: "nordstrand",
      date: friday,
      startTime: "10:00",
      requestedParticipants: 6,
      now,
      openingHours: [{ weekday: 5, openTime: "08:00", closeTime: "18:00" }],
      blackouts: [],
      session: {
        id: "s1",
        maxParticipants: 8,
        bookedParticipants: 0,
        status: "PLANNED",
        instructorIds: ["tom"],
      },
      instructors,
      resources: [
        { resourceTypeId: "board", availableCount: 6 },
        { resourceTypeId: "wetsuit", availableCount: 10 },
      ],
    });

    expect(result.availableSlots).toBe(6);
    expect(result.available).toBe(true);
    expect(result.sessionCapacity).toBe(8);
    expect(result.instructorCapacity).toBe(8);
  });

  it("rejects a booking above the bottleneck", () => {
    const result = computeAvailability({
      product: baseProduct,
      locationId: "nordstrand",
      date: friday,
      startTime: "10:00",
      requestedParticipants: 7,
      now,
      openingHours: [{ weekday: 5, openTime: "08:00", closeTime: "18:00" }],
      blackouts: [],
      session: {
        id: "s1",
        maxParticipants: 8,
        bookedParticipants: 0,
        status: "PLANNED",
        instructorIds: ["tom"],
      },
      instructors,
      resources: [
        { resourceTypeId: "board", availableCount: 6 },
        { resourceTypeId: "wetsuit", availableCount: 10 },
      ],
    });

    expect(result.available).toBe(false);
    expect(result.availableSlots).toBe(6);
    expect(result.reasons).toContain("insufficient_capacity");
    expect(result.missingResources[0]?.resourceTypeName).toBe("Surfboard");
  });

  it("blocks instructor double booking", () => {
    const result = computeAvailability({
      product: baseProduct,
      locationId: "nordstrand",
      date: friday,
      startTime: "10:00",
      requestedParticipants: 2,
      now,
      openingHours: [{ weekday: 5, openTime: "08:00", closeTime: "18:00" }],
      blackouts: [],
      instructors: [
        {
          id: "tom",
          canTeach: true,
          availableAtLocation: true,
          overlapping: true,
          absent: false,
          withinWeeklyHours: true,
        },
      ],
      resources: [
        { resourceTypeId: "board", availableCount: 20 },
        { resourceTypeId: "wetsuit", availableCount: 30 },
      ],
    });

    expect(result.available).toBe(false);
    expect(result.reasons).toContain("no_instructor");
    expect(result.warnings).toContain("instructor_double_booking");
  });

  it("enforces lead time, opening hours and unpublished products", () => {
    const unpublished = computeAvailability({
      product: { ...baseProduct, published: false, bookingLeadHours: 0 },
      locationId: "nordstrand",
      date: friday,
      startTime: "10:00",
      requestedParticipants: 1,
      now: friday,
      openingHours: [{ weekday: 5, openTime: "08:00", closeTime: "18:00" }],
      blackouts: [],
      instructors,
      resources: [
        { resourceTypeId: "board", availableCount: 20 },
        { resourceTypeId: "wetsuit", availableCount: 30 },
      ],
    });
    expect(unpublished.reasons).toContain("product_unpublished");

    const tooLate = computeAvailability({
      product: baseProduct,
      locationId: "nordstrand",
      date: friday,
      startTime: "10:00",
      requestedParticipants: 1,
      now: new Date(2026, 7, 14, 9, 0, 0),
      openingHours: [{ weekday: 5, openTime: "08:00", closeTime: "18:00" }],
      blackouts: [],
      instructors,
      resources: [
        { resourceTypeId: "board", availableCount: 20 },
        { resourceTypeId: "wetsuit", availableCount: 30 },
      ],
    });
    expect(tooLate.reasons).toContain("lead_time");
  });
});
