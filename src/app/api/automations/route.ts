import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAutomations, runSingleRule } from "@/lib/automations/runner";
import { handleError, jsonError, requirePermission } from "@/lib/api/guard";
import { z } from "zod";

export async function GET() {
  try {
    await requirePermission("products.write");
    const rules = await prisma.automationRule.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ data: rules });
  } catch (error) {
    return handleError(error);
  }
}

const patchSchema = z.object({
  id: z.string(),
  active: z.boolean().optional(),
  run: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    await requirePermission("products.write");
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    if (parsed.data.run) {
      const result = await runSingleRule(parsed.data.id);
      return NextResponse.json({ data: result });
    }
    const rule = await prisma.automationRule.update({
      where: { id: parsed.data.id },
      data: { active: parsed.data.active },
    });
    return NextResponse.json({ data: rule });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission("products.write");
    const body = await request.json().catch(() => ({}));
    const results = await runAutomations(body.organizationId);
    return NextResponse.json({ data: results });
  } catch (error) {
    return handleError(error);
  }
}
