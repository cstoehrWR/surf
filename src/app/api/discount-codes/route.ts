import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";
import { resolveDiscountCode } from "@/lib/discounts/service";

export async function GET() {
  try {
    const { organizationId } = await requireTenant("payments.read");
    const data = await prisma.discountCode.findMany({
      where: orgWhere(organizationId),
      orderBy: { code: "asc" },
    });
    return NextResponse.json({
      data: data.map((d) => ({
        ...d,
        percent: d.percent != null ? Number(d.percent) : null,
        amount: d.amount != null ? Number(d.amount) : null,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

const createSchema = z
  .object({
    code: z.string().min(2).max(40),
    percent: z.coerce.number().positive().max(100).optional().nullable(),
    amount: z.coerce.number().positive().optional().nullable(),
    validFrom: z.string().optional().nullable(),
    validTo: z.string().optional().nullable(),
    active: z.boolean().optional(),
  })
  .refine((d) => d.percent != null || d.amount != null, {
    message: "percent or amount required",
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === "validate") {
      const code = String(body.code ?? "");
      const organizationId = String(body.organizationId ?? "");
      const total = Number(body.total ?? 0);
      if (!organizationId) return jsonError("organizationId required");
      const resolved = await resolveDiscountCode({
        organizationId,
        code,
        total,
      });
      if (!resolved) return jsonError("Invalid or expired code", 400);
      return NextResponse.json({ data: resolved });
    }

    const { user, organizationId } = await requireTenant("payments.write");
    const orgId = organizationId ?? user.organizationId;
    if (!orgId) return jsonError("Organization required");
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    const created = await prisma.discountCode.create({
      data: {
        organizationId: orgId,
        code: parsed.data.code.trim().toUpperCase(),
        percent: parsed.data.percent ?? null,
        amount: parsed.data.amount ?? null,
        validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : null,
        validTo: parsed.data.validTo ? new Date(parsed.data.validTo) : null,
        active: parsed.data.active ?? true,
      },
    });
    return NextResponse.json(
      {
        data: {
          ...created,
          percent: created.percent != null ? Number(created.percent) : null,
          amount: created.amount != null ? Number(created.amount) : null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { organizationId } = await requireTenant("payments.write");
    const body = await request.json();
    const id = z.string().parse(body.id);
    const existing = await prisma.discountCode.findFirst({
      where: { id, ...orgWhere(organizationId) },
    });
    if (!existing) return jsonError("Not found", 404);
    const updated = await prisma.discountCode.update({
      where: { id },
      data: {
        active: body.active,
        percent: body.percent,
        amount: body.amount,
        validFrom: body.validFrom ? new Date(body.validFrom) : body.validFrom === null ? null : undefined,
        validTo: body.validTo ? new Date(body.validTo) : body.validTo === null ? null : undefined,
      },
    });
    return NextResponse.json({
      data: {
        ...updated,
        percent: updated.percent != null ? Number(updated.percent) : null,
        amount: updated.amount != null ? Number(updated.amount) : null,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { organizationId } = await requireTenant("payments.write");
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return jsonError("id required");
    const existing = await prisma.discountCode.findFirst({
      where: { id, ...orgWhere(organizationId) },
    });
    if (!existing) return jsonError("Not found", 404);
    await prisma.discountCode.delete({ where: { id } });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleError(error);
  }
}
