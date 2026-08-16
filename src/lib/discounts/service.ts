import { prisma } from "@/lib/db";

export type ResolvedDiscount = {
  id: string;
  code: string;
  percent: number | null;
  amount: number | null;
  discount: number;
};

export function applyDiscountToTotal(
  total: number,
  discount: { percent: number | null; amount: number | null },
): number {
  let next = total;
  if (discount.percent != null) {
    next = Math.round(total * (1 - discount.percent / 100) * 100) / 100;
  } else if (discount.amount != null) {
    next = Math.max(0, Math.round((total - discount.amount) * 100) / 100);
  }
  return next;
}

export async function resolveDiscountCode(params: {
  organizationId: string;
  code: string;
  date?: Date;
  total: number;
}): Promise<ResolvedDiscount | null> {
  const code = params.code.trim().toUpperCase();
  if (!code) return null;
  const row = await prisma.discountCode.findUnique({
    where: {
      organizationId_code: {
        organizationId: params.organizationId,
        code,
      },
    },
  });
  if (!row || !row.active) return null;
  const now = params.date ?? new Date();
  if (row.validFrom && now < row.validFrom) return null;
  if (row.validTo && now > row.validTo) return null;

  const percent = row.percent != null ? Number(row.percent) : null;
  const amount = row.amount != null ? Number(row.amount) : null;
  const discounted = applyDiscountToTotal(params.total, { percent, amount });
  return {
    id: row.id,
    code: row.code,
    percent,
    amount,
    discount: Math.round((params.total - discounted) * 100) / 100,
  };
}
