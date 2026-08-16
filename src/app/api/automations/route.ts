import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { runAutomations, runSingleRule } from "@/lib/automations/runner";
import { handleError, jsonError, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";

const TRIGGERS = ["session.upcoming", "session.completed"] as const;
const ACTIONS = ["email.reminder", "email.waiver_missing", "email.followup"] as const;

export async function GET() {
  try {
    const { organizationId } = await requireTenant("products.write");
    const rules = await prisma.automationRule.findMany({
      where: orgWhere(organizationId),
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: rules });
  } catch (error) {
    return handleError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(2).max(120),
  trigger: z.enum(TRIGGERS),
  offsetHours: z.coerce.number().int().min(-720).max(720),
  action: z.enum(ACTIONS),
  active: z.boolean().optional(),
});

const patchSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(120).optional(),
  trigger: z.enum(TRIGGERS).optional(),
  offsetHours: z.coerce.number().int().min(-720).max(720).optional(),
  action: z.enum(ACTIONS).optional(),
  active: z.boolean().optional(),
  run: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await requireTenant("products.write");
    const orgId = organizationId ?? user.organizationId;
    if (!orgId) return jsonError("Organization required");

    const body = await request.json().catch(() => ({}));
    if (body?.action === "runAll" || Object.keys(body).length === 0) {
      const results = await runAutomations(orgId);
      return NextResponse.json({ data: results });
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    const rule = await prisma.automationRule.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name,
        trigger: parsed.data.trigger,
        offsetHours: parsed.data.offsetHours,
        action: parsed.data.action,
        active: parsed.data.active ?? true,
      },
    });
    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { organizationId } = await requireTenant("products.write");
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    const existing = await prisma.automationRule.findFirst({
      where: { id: parsed.data.id, ...orgWhere(organizationId) },
    });
    if (!existing) return jsonError("Not found", 404);

    if (parsed.data.run) {
      const result = await runSingleRule(parsed.data.id);
      return NextResponse.json({ data: result });
    }

    const rule = await prisma.automationRule.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        trigger: parsed.data.trigger,
        offsetHours: parsed.data.offsetHours,
        action: parsed.data.action,
        active: parsed.data.active,
      },
    });
    return NextResponse.json({ data: rule });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { organizationId } = await requireTenant("products.write");
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return jsonError("id required");
    const existing = await prisma.automationRule.findFirst({
      where: { id, ...orgWhere(organizationId) },
    });
    if (!existing) return jsonError("Not found", 404);
    await prisma.automationRule.delete({ where: { id } });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleError(error);
  }
}
