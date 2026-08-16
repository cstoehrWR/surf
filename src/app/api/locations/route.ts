import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";

export async function GET(request: NextRequest) {
  const orgSlug = new URL(request.url).searchParams.get("org") ?? undefined;
  const organizationId = new URL(request.url).searchParams.get("organizationId") ?? undefined;
  const admin = new URL(request.url).searchParams.get("admin") === "1";

  let orgId = organizationId;
  if (!orgId && orgSlug) {
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug, active: true } });
    orgId = org?.id;
  }
  if (admin) {
    const tenant = await requireTenant("products.read");
    orgId = orgId ?? tenant.organizationId ?? undefined;
  }

  const locations = await prisma.location.findMany({
    where: {
      ...(admin ? {} : { active: true }),
      ...(orgId ? { organizationId: orgId } : {}),
    },
    include: admin
      ? {
          openingHours: { orderBy: { weekday: "asc" } },
          blackouts: { orderBy: { startsAt: "asc" }, take: 50 },
        }
      : undefined,
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: locations });
}

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  address: z.string().optional(),
  timezone: z.string().optional(),
  active: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await requireTenant("settings.manage");
    const orgId = organizationId ?? user.organizationId;
    if (!orgId) return jsonError("Organization required");
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    const location = await prisma.location.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        address: parsed.data.address,
        timezone: parsed.data.timezone ?? "Europe/Berlin",
        active: parsed.data.active ?? true,
        openingHours: {
          create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
            weekday,
            openTime: "08:00",
            closeTime: "18:00",
          })),
        },
      },
    });
    return NextResponse.json({ data: location }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { organizationId } = await requireTenant("settings.manage");
    const body = await request.json();
    const id = z.string().parse(body.id);
    const existing = await prisma.location.findFirst({
      where: { id, ...orgWhere(organizationId) },
    });
    if (!existing) return jsonError("Not found", 404);
    const location = await prisma.location.update({
      where: { id },
      data: {
        name: body.name,
        address: body.address,
        active: body.active,
      },
    });
    return NextResponse.json({ data: location });
  } catch (error) {
    return handleError(error);
  }
}
