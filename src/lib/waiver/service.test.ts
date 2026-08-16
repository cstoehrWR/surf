import { ageFromDob, isMinor, requiresGuardian } from "./service";

describe("Waiver rules", () => {
  it("detects minors and requires guardian", () => {
    expect(isMinor(17)).toBe(true);
    expect(isMinor(18)).toBe(false);
    expect(requiresGuardian(12)).toBe(true);
    expect(requiresGuardian(18)).toBe(false);
    expect(requiresGuardian(null)).toBe(false);
  });

  it("calculates age from date of birth", () => {
    const on = new Date(2026, 7, 14);
    expect(ageFromDob(new Date(2010, 7, 14), on)).toBe(16);
    expect(ageFromDob(new Date(2010, 7, 15), on)).toBe(15);
  });
});
