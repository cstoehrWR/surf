import { shouldPromoteWaitlist, holdExpiresAt } from "./logic";

describe("waitlist logic", () => {
  it("promotes when capacity fits and no hold", () => {
    expect(
      shouldPromoteWaitlist({ freeSlots: 2, entryParticipants: 1, hasActiveHold: false }),
    ).toBe(true);
  });

  it("blocks when active hold exists", () => {
    expect(
      shouldPromoteWaitlist({ freeSlots: 3, entryParticipants: 1, hasActiveHold: true }),
    ).toBe(false);
  });

  it("blocks when entry needs more seats than free", () => {
    expect(
      shouldPromoteWaitlist({ freeSlots: 1, entryParticipants: 2, hasActiveHold: false }),
    ).toBe(false);
  });

  it("computes hold expiry", () => {
    const notified = new Date("2026-08-14T12:00:00Z");
    expect(holdExpiresAt(notified, 24).toISOString()).toBe("2026-08-15T12:00:00.000Z");
  });
});
