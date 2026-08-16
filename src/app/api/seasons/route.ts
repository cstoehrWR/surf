import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";

export async function GET() {
  try {
    const { organizationId } = await requireTenant("settings.manage");
    const data = await prisma.season.findMany({
      where: orgWhere(organizationId),
      include: { location: true },
      orderBy: { startsOn: "asc" },
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleError(error);
  }
}

const schema = z.object({
  name: z.string().min(2).max(120),
  locationId: z.string().optional().nullable(),
  startsOn: z.string(),
  endsOn: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await requireTenant("settings.manage");
    const orgId = organizationId ?? user.organizationId;
    if (!orgId) return jsonError("Organization required");
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    const startsOn = new Date(parsed.data.startsOn);
    const endsOn = new Date(parsed.data.endsOn);
    if (!(endsOn >= startsOn)) return jsonError("endsOn must be on/after startsOn");

    const season = await prisma.season.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name,
        locationId: parsed.data.locationId || null,
        startsOn,
        endsOn,
      },
      include: { location: true },
    });
    return NextResponse.json({ data: season }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { organizationId } = await requireTenant("settings.manage");
    const body = await request.json();
    const id = z.string().parse(body.id);
    const existing = await prisma.season.findFirst({
      where: { id, ...orgWhere(organizationId) },
    });
    if (!existing) return jsonError("Not found", 404);

    const season = await prisma.season.update({
      where: { id },
      data: {
        name: body.name,
        locationId: body.locationId === undefined ? undefined : body.locationId || null,
        startsOn: body.startsOn ? new Date(body.startsOn) : undefined,
        endsOn: body.endsOn ? new Date(body.endsOn) : undefined,
      },
      include: { location: true },
    });
    return NextResponse.json({ data: season });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { organizationId } = await requireTenant("settings.manage");
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return jsonError("id required");
    const existing = await prisma.season.findFirst({
      where: { id, ...orgWhere(organizationId) },
    });
    if (!existing) return jsonError("Not found", 404);
    await prisma.season.delete({ where: { id } });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleError(error);
  }
}
