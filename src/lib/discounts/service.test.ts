import { describe, expect, it } from "vitest";
import { applyDiscountToTotal } from "@/lib/discounts/service";

describe("applyDiscountToTotal", () => {
  it("applies percent discount", () => {
    expect(applyDiscountToTotal(100, { percent: 10, amount: null })).toBe(90);
  });

  it("applies amount discount and floors at zero", () => {
    expect(applyDiscountToTotal(40, { percent: null, amount: 50 })).toBe(0);
    expect(applyDiscountToTotal(80, { percent: null, amount: 12.5 })).toBe(67.5);
  });
});
