import { calculatePrice } from "./engine";

const base = {
  basePrice: 100,
  participants: 2,
  date: new Date("2026-08-22T10:00:00"), // Saturday
  now: new Date("2026-08-14T10:00:00"),
  rules: [] as PriceContextRules,
};

type PriceContextRules = Parameters<typeof calculatePrice>[0]["rules"];

describe("calculatePrice", () => {
  it("uses variant price as base", () => {
    const result = calculatePrice({ ...base, variantPrice: 80, rules: [] });
    expect(result.unitPrice).toBe(80);
    expect(result.lineTotal).toBe(160);
  });

  it("applies weekend absolute price", () => {
    const result = calculatePrice({
      ...base,
      rules: [
        {
          type: "WEEKEND",
          priority: 10,
          amount: 120,
          percent: null,
          weekday: null,
          minParticipants: null,
          maxParticipants: null,
          active: true,
        },
      ],
    });
    expect(result.unitPrice).toBe(120);
    expect(result.appliedRules.some((r) => r.type === "WEEKEND")).toBe(true);
  });

  it("applies group discount by participant count", () => {
    const result = calculatePrice({
      ...base,
      participants: 4,
      rules: [
        {
          type: "GROUP",
          name: "4er-Rabatt",
          priority: 20,
          amount: null,
          percent: 10,
          weekday: null,
          minParticipants: 4,
          maxParticipants: null,
          active: true,
        },
      ],
    });
    expect(result.unitPrice).toBe(90);
    expect(result.lineTotal).toBe(360);
  });

  it("applies early bird when enough days ahead", () => {
    const result = calculatePrice({
      ...base,
      rules: [
        {
          type: "EARLY_BIRD",
          priority: 15,
          amount: null,
          percent: 15,
          weekday: null,
          minParticipants: 7,
          maxParticipants: null,
          active: true,
        },
      ],
    });
    expect(result.unitPrice).toBe(85);
  });

  it("skips early bird when too close", () => {
    const result = calculatePrice({
      ...base,
      now: new Date("2026-08-20T10:00:00"),
      rules: [
        {
          type: "EARLY_BIRD",
          priority: 15,
          amount: null,
          percent: 15,
          weekday: null,
          minParticipants: 7,
          maxParticipants: null,
          active: true,
        },
      ],
    });
    expect(result.unitPrice).toBe(100);
  });

  it("respects validity window", () => {
    const result = calculatePrice({
      ...base,
      rules: [
        {
          type: "SEASON",
          priority: 5,
          amount: 140,
          percent: null,
          weekday: null,
          minParticipants: null,
          maxParticipants: null,
          validFrom: "2026-09-01",
          validTo: "2026-09-30",
          active: true,
        },
      ],
    });
    expect(result.unitPrice).toBe(100);
  });

  it("applies last minute within window", () => {
    const result = calculatePrice({
      ...base,
      now: new Date("2026-08-21T10:00:00"),
      rules: [
        {
          type: "LAST_MINUTE",
          priority: 30,
          amount: 79,
          percent: null,
          weekday: null,
          minParticipants: null,
          maxParticipants: 2,
          active: true,
        },
      ],
    });
    expect(result.unitPrice).toBe(79);
  });
});
