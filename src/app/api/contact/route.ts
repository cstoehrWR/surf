import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, rateLimit, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";
import { sendTemplatedEmail } from "@/lib/notifications/provider";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";

export async function GET() {
  try {
    const { organizationId } = await requireTenant("customers.read");
    const data = await prisma.contactMessage.findMany({
      where: orgWhere(organizationId),
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleError(error);
  }
}

const schema = z.object({
  organizationId: z.string().optional(),
  orgSlug: z.string().optional(),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  message: z.string().min(5).max(4000),
  pageSlug: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (!rateLimit(`contact:${ip}`, 10, 60_000)) return jsonError("Too many requests", 429);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    let organizationId = parsed.data.organizationId;
    if (!organizationId && parsed.data.orgSlug) {
      const org = await prisma.organization.findFirst({
        where: { slug: parsed.data.orgSlug, active: true },
      });
      organizationId = org?.id;
    }
    if (!organizationId) return jsonError("Organization required");

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { site: true },
    });

    const msg = await prisma.contactMessage.create({
      data: {
        organizationId,
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone,
        message: parsed.data.message,
        pageSlug: parsed.data.pageSlug,
      },
    });

    const notifyTo = org.site?.contactEmail;
    if (notifyTo) {
      await sendTemplatedEmail({
        organizationId,
        to: notifyTo,
        templateKey: "contact.received",
        variables: {
          "customer.firstName": parsed.data.name,
          email: parsed.data.email,
          message: parsed.data.message,
        },
      }).catch(() => null);
    }

    await dispatchWebhook({
      organizationId,
      event: "contact.received",
      payload: { id: msg.id, email: msg.email, name: msg.name },
    });

    return NextResponse.json({ data: { ok: true, id: msg.id } }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireTenant("customers.write");
    const body = await request.json();
    const id = z.string().parse(body.id);
    const status = z.enum(["new", "read", "done"]).parse(body.status);
    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { status },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleError(error);
  }
}
