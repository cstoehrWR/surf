import {
  computeLodgingAvailability,
  eachNight,
  lodgingLineTotal,
  nightsCount,
} from "./availability";

describe("lodging availability", () => {
  const checkIn = new Date("2026-08-20");
  const checkOut = new Date("2026-08-23");

  it("counts nights exclusive of checkout", () => {
    expect(nightsCount(checkIn, checkOut)).toBe(3);
    expect(eachNight(checkIn, checkOut)).toHaveLength(3);
  });

  it("finds free units across the stay", () => {
    const result = computeLodgingAvailability({
      units: [
        { id: "a", capacity: 4, active: true },
        { id: "b", capacity: 2, active: true },
      ],
      occupied: [{ unitId: "a", night: "2026-08-21" }],
      checkIn,
      checkOut,
      guests: 2,
    });
    expect(result.available).toBe(true);
    expect(result.unitIds).toEqual(["b"]);
  });

  it("rejects when capacity too small", () => {
    const result = computeLodgingAvailability({
      units: [{ id: "a", capacity: 2, active: true }],
      occupied: [],
      checkIn,
      checkOut,
      guests: 4,
    });
    expect(result.available).toBe(false);
  });

  it("prices nights × units", () => {
    expect(lodgingLineTotal({ nightlyRate: 89, nights: 3, units: 1 })).toBe(267);
  });
});
