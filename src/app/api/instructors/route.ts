import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";
import { ProductType, SurfLevel } from "@prisma/client";

export async function GET() {
  try {
    const { organizationId } = await requireTenant("sessions.read");
    const data = await prisma.instructor.findMany({
      where: orgWhere(organizationId),
      include: { locations: { include: { location: true } }, productTypes: true },
      orderBy: { firstName: "asc" },
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleError(error);
  }
}

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  qualifications: z.array(z.string()).optional(),
  level: z.enum(["NONE", "BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO"]).optional(),
  maxWeeklyHours: z.coerce.number().int().optional(),
  locationIds: z.array(z.string()).optional(),
  productTypes: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await requireTenant("staff.write");
    const orgId = organizationId ?? user.organizationId;
    if (!orgId) return jsonError("Organization required");
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    const instructor = await prisma.instructor.create({
      data: {
        organizationId: orgId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        qualifications: parsed.data.qualifications ?? [],
        level: (parsed.data.level as SurfLevel) ?? SurfLevel.INTERMEDIATE,
        maxWeeklyHours: parsed.data.maxWeeklyHours ?? 40,
        active: parsed.data.active ?? true,
        locations: parsed.data.locationIds?.length
          ? { create: parsed.data.locationIds.map((locationId) => ({ locationId })) }
          : undefined,
        productTypes: parsed.data.productTypes?.length
          ? {
              create: parsed.data.productTypes.map((productType) => ({
                productType: productType as ProductType,
              })),
            }
          : undefined,
      },
      include: { locations: { include: { location: true } }, productTypes: true },
    });
    return NextResponse.json({ data: instructor }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireTenant("staff.write");
    const body = await request.json();
    const id = z.string().parse(body.id);
    const instructor = await prisma.instructor.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        active: body.active,
        maxWeeklyHours: body.maxWeeklyHours,
        level: body.level,
        qualifications: body.qualifications,
      },
      include: { locations: { include: { location: true } }, productTypes: true },
    });
    return NextResponse.json({ data: instructor });
  } catch (error) {
    return handleError(error);
  }
}
