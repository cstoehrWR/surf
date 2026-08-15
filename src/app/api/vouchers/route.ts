import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createVoucher, redeemVoucher } from "@/lib/vouchers/service";
import { handleError, jsonError, requirePermission, requireTenant } from "@/lib/api/guard";
import { PaymentMethod, VoucherType } from "@prisma/client";
import { confirmBookingPayment } from "@/lib/booking/service";
import { orgWhere } from "@/lib/tenant/org";

export async function GET() {
  try {
    const { organizationId } = await requireTenant("payments.read");
    const data = await prisma.voucher.findMany({
      where: orgWhere(organizationId),
      orderBy: { code: "asc" },
    });
    return NextResponse.json({
      data: data.map((v) => ({
        ...v,
        originalValue: Number(v.originalValue),
        remainingValue: Number(v.remainingValue),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

const createSchema = z.object({
  organizationId: z.string().optional(),
  code: z.string().min(3).max(40),
  type: z.enum(["VALUE", "PRODUCT", "DISCOUNT"]),
  value: z.coerce.number().positive(),
  validTo: z.string().optional(),
  productId: z.string().optional(),
  locationId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === "redeem") {
      const user = await requirePermission("bookings.write");
      void user;
      const redeemSchema = z.object({
        code: z.string(),
        bookingId: z.string(),
      });
      const parsed = redeemSchema.safeParse(body);
      if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
      const booking = await prisma.booking.findUniqueOrThrow({
        where: { id: parsed.data.bookingId },
        include: { items: true },
      });
      const due = Math.max(0, Number(booking.total) - Number(booking.amountPaid));
      if (due <= 0) return jsonError("Nothing to pay");
      const result = await redeemVoucher({
        organizationId: booking.organizationId,
        code: parsed.data.code,
        amount: due,
        productId: booking.items[0]?.productId,
        locationId: booking.locationId,
      });
      await confirmBookingPayment({
        bookingId: booking.id,
        provider: "voucher",
        method: PaymentMethod.VOUCHER,
        amount: result.applied,
        reference: `voucher_${result.code}`,
      });
      return NextResponse.json({ data: result });
    }

    const user = await requirePermission("payments.write");
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const orgId =
      parsed.data.organizationId ??
      user.organizationId ??
      (await prisma.organization.findFirstOrThrow()).id;
    const voucher = await createVoucher({
      organizationId: orgId,
      code: parsed.data.code,
      type: parsed.data.type as VoucherType,
      value: parsed.data.value,
      validTo: parsed.data.validTo ? new Date(parsed.data.validTo) : null,
      productId: parsed.data.productId,
      locationId: parsed.data.locationId,
    });
    return NextResponse.json(
      {
        data: {
          ...voucher,
          originalValue: Number(voucher.originalValue),
          remainingValue: Number(voucher.remainingValue),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}
