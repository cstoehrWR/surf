import { computeVoucherApplication } from "./service";

describe("Voucher application", () => {
  it("applies partial value vouchers", () => {
    expect(
      computeVoucherApplication({
        type: "VALUE",
        remainingValue: 40,
        bookingTotal: 100,
      }),
    ).toBe(40);
  });

  it("never exceeds booking total", () => {
    expect(
      computeVoucherApplication({
        type: "VALUE",
        remainingValue: 120,
        bookingTotal: 69,
      }),
    ).toBe(69);
  });
});
