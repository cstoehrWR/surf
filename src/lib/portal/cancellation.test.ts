import { describe, expect, it } from "vitest";

function cancellationAllowed(params: {
  status: string;
  startsAt: Date;
  cancellationHours: number;
  now: Date;
}) {
  if (["CANCELLED", "COMPLETED", "CHECKED_IN"].includes(params.status)) return false;
  const deadline = new Date(params.startsAt.getTime() - params.cancellationHours * 3600_000);
  return params.now.getTime() < deadline.getTime();
}

describe("Portal cancellation window", () => {
  it("allows cancel before deadline", () => {
    const startsAt = new Date("2026-08-20T10:00:00");
    expect(
      cancellationAllowed({
        status: "CONFIRMED",
        startsAt,
        cancellationHours: 24,
        now: new Date("2026-08-18T09:00:00"),
      }),
    ).toBe(true);
  });

  it("blocks cancel inside the window", () => {
    const startsAt = new Date("2026-08-20T10:00:00");
    expect(
      cancellationAllowed({
        status: "CONFIRMED",
        startsAt,
        cancellationHours: 24,
        now: new Date("2026-08-19T12:00:00"),
      }),
    ).toBe(false);
  });
});
