import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requirePermission, requireTenant } from "@/lib/api/guard";
import { processQueuedWebhooks } from "@/lib/webhooks/dispatch";
import { orgWhere } from "@/lib/tenant/org";

const EVENT_OPTIONS = [
  "booking.created",
  "booking.cancelled",
  "payment.received",
  "participant.updated",
  "waiver.signed",
  "waitlist.joined",
  "waitlist.promoted",
];

export async function GET() {
  try {
    const { organizationId } = await requireTenant("settings.manage");
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: orgWhere(organizationId),
      include: {
        deliveries: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { url: "asc" },
    });
    return NextResponse.json({ data: endpoints, events: EVENT_OPTIONS });
  } catch (error) {
    return handleError(error);
  }
}

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  active: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("settings.manage");
    const body = await request.json();

    if (body.action === "process") {
      const result = await processQueuedWebhooks();
      return NextResponse.json({ data: result });
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const orgId = user.organizationId ?? (await prisma.organization.findFirstOrThrow()).id;
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        organizationId: orgId,
        url: parsed.data.url,
        events: parsed.data.events,
        secret: randomBytes(24).toString("hex"),
        active: parsed.data.active ?? true,
      },
    });
    return NextResponse.json({ data: endpoint }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requirePermission("settings.manage");
    const body = await request.json();
    const id = z.string().parse(body.id);
    const endpoint = await prisma.webhookEndpoint.update({
      where: { id },
      data: {
        url: body.url,
        events: body.events,
        active: body.active,
      },
    });
    return NextResponse.json({ data: endpoint });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requirePermission("settings.manage");
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return jsonError("id required");
    await prisma.webhookEndpoint.delete({ where: { id } });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleError(error);
  }
}
