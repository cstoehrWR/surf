import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requirePermission, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await requireTenant("products.read");
    const productId = new URL(request.url).searchParams.get("productId");
    const data = await prisma.priceRule.findMany({
      where: {
        ...orgWhere(organizationId),
        ...(productId ? { productId } : {}),
      },
      include: { product: { select: { id: true, name: true } } },
      orderBy: [{ priority: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({
      data: data.map((r) => ({
        ...r,
        amount: r.amount != null ? Number(r.amount) : null,
        percent: r.percent != null ? Number(r.percent) : null,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

const schema = z.object({
  organizationId: z.string().optional(),
  productId: z.string().nullable().optional(),
  name: z.string().min(2),
  type: z.enum(["WEEKEND", "SEASON", "GROUP", "DISCOUNT", "EARLY_BIRD", "LAST_MINUTE", "CHILD", "ADULT"]),
  priority: z.coerce.number().int().default(100),
  amount: z.coerce.number().optional().nullable(),
  percent: z.coerce.number().optional().nullable(),
  minParticipants: z.coerce.number().int().optional().nullable(),
  maxParticipants: z.coerce.number().int().optional().nullable(),
  weekday: z.coerce.number().int().min(0).max(6).optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("products.write");
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const orgId =
      parsed.data.organizationId ??
      user.organizationId ??
      (await prisma.organization.findFirstOrThrow()).id;

    const rule = await prisma.priceRule.create({
      data: {
        organizationId: orgId,
        productId: parsed.data.productId ?? null,
        name: parsed.data.name,
        type: parsed.data.type,
        priority: parsed.data.priority,
        amount: parsed.data.amount ?? null,
        percent: parsed.data.percent ?? null,
        minParticipants: parsed.data.minParticipants ?? null,
        maxParticipants: parsed.data.maxParticipants ?? null,
        weekday: parsed.data.weekday ?? null,
        validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : null,
        validTo: parsed.data.validTo ? new Date(parsed.data.validTo) : null,
        active: parsed.data.active ?? true,
      },
    });
    return NextResponse.json(
      {
        data: {
          ...rule,
          amount: rule.amount != null ? Number(rule.amount) : null,
          percent: rule.percent != null ? Number(rule.percent) : null,
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
    await requirePermission("products.write");
    const body = await request.json();
    const id = z.string().parse(body.id);
    const rule = await prisma.priceRule.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
        priority: body.priority,
        amount: body.amount,
        percent: body.percent,
        minParticipants: body.minParticipants,
        maxParticipants: body.maxParticipants,
        weekday: body.weekday,
        active: body.active,
        validFrom: body.validFrom ? new Date(body.validFrom) : body.validFrom === null ? null : undefined,
        validTo: body.validTo ? new Date(body.validTo) : body.validTo === null ? null : undefined,
      },
    });
    return NextResponse.json({
      data: {
        ...rule,
        amount: rule.amount != null ? Number(rule.amount) : null,
        percent: rule.percent != null ? Number(rule.percent) : null,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requirePermission("products.write");
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return jsonError("id required");
    await prisma.priceRule.delete({ where: { id } });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleError(error);
  }
}
