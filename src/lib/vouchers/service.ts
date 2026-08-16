import { prisma } from "@/lib/db";
import { BookingError } from "@/lib/booking/service";
import { VoucherType } from "@prisma/client";

export type RedeemResult = {
  voucherId: string;
  code: string;
  applied: number;
  remainingValue: number;
};

export function normalizeVoucherCode(code: string) {
  return code.trim().toUpperCase();
}

export async function createVoucher(params: {
  organizationId: string;
  code: string;
  type: VoucherType;
  value: number;
  validFrom?: Date | null;
  validTo?: Date | null;
  productId?: string | null;
  locationId?: string | null;
}) {
  const code = normalizeVoucherCode(params.code);
  return prisma.voucher.create({
    data: {
      organizationId: params.organizationId,
      code,
      type: params.type,
      originalValue: params.value,
      remainingValue: params.value,
      validFrom: params.validFrom ?? null,
      validTo: params.validTo ?? null,
      productId: params.productId ?? null,
      locationId: params.locationId ?? null,
      status: "active",
    },
  });
}

export async function redeemVoucher(params: {
  organizationId: string;
  code: string;
  amount: number;
  productId?: string;
  locationId?: string;
}): Promise<RedeemResult> {
  if (params.amount <= 0) throw new BookingError("Invalid amount", "INVALID_AMOUNT");
  const code = normalizeVoucherCode(params.code);

  return prisma.$transaction(async (tx) => {
    const voucher = await tx.voucher.findUnique({
      where: {
        organizationId_code: { organizationId: params.organizationId, code },
      },
    });
    if (!voucher || voucher.status !== "active") {
      throw new BookingError("Voucher invalid", "VOUCHER_INVALID");
    }
    const now = new Date();
    if (voucher.validFrom && voucher.validFrom > now) {
      throw new BookingError("Voucher not yet valid", "VOUCHER_NOT_VALID");
    }
    if (voucher.validTo && voucher.validTo < now) {
      throw new BookingError("Voucher expired", "VOUCHER_EXPIRED");
    }
    if (voucher.productId && params.productId && voucher.productId !== params.productId) {
      throw new BookingError("Voucher product restricted", "VOUCHER_PRODUCT");
    }
    if (voucher.locationId && params.locationId && voucher.locationId !== params.locationId) {
      throw new BookingError("Voucher location restricted", "VOUCHER_LOCATION");
    }

    const remaining = Number(voucher.remainingValue);
    if (remaining <= 0) throw new BookingError("Voucher empty", "VOUCHER_EMPTY");

    let applied = Math.min(remaining, params.amount);
    if (voucher.type === "DISCOUNT") {
      applied = Math.min(remaining, params.amount);
    }
    if (voucher.type === "PRODUCT" && voucher.productId && params.productId !== voucher.productId) {
      throw new BookingError("Voucher product restricted", "VOUCHER_PRODUCT");
    }

    const nextRemaining = Math.round((remaining - applied) * 100) / 100;
    const updated = await tx.voucher.update({
      where: { id: voucher.id },
      data: {
        remainingValue: nextRemaining,
        status: nextRemaining <= 0 ? "redeemed" : "active",
      },
    });

    return {
      voucherId: updated.id,
      code: updated.code,
      applied,
      remainingValue: Number(updated.remainingValue),
    };
  });
}

export function computeVoucherApplication(params: {
  type: VoucherType;
  remainingValue: number;
  bookingTotal: number;
}) {
  if (params.remainingValue <= 0) return 0;
  if (params.type === "DISCOUNT") {
    return Math.min(params.remainingValue, params.bookingTotal);
  }
  return Math.min(params.remainingValue, params.bookingTotal);
}
