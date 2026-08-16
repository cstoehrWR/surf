import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requirePermission, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";
import { ResourceStatus } from "@prisma/client";

export async function GET() {
  try {
    const { organizationId } = await requireTenant("resources.read");
    const resources = await prisma.resource.findMany({
      where: orgWhere(organizationId),
      include: { resourceType: true, location: true },
      orderBy: { inventoryCode: "asc" },
    });
    const types = await prisma.resourceType.findMany({
      where: orgWhere(organizationId),
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: resources, types });
  } catch (error) {
    return handleError(error);
  }
}

const createSchema = z.object({
  locationId: z.string(),
  resourceTypeId: z.string().optional(),
  newTypeKey: z.string().optional(),
  newTypeName: z.string().optional(),
  inventoryCode: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["AVAILABLE", "RESERVED", "ISSUED", "DEFECT", "MAINTENANCE", "LOST"]).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await requireTenant("resources.write");
    const orgId = organizationId ?? user.organizationId;
    if (!orgId) return jsonError("Organization required");
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    let resourceTypeId = parsed.data.resourceTypeId;
    if (!resourceTypeId && parsed.data.newTypeKey && parsed.data.newTypeName) {
      const type = await prisma.resourceType.create({
        data: {
          organizationId: orgId,
          key: parsed.data.newTypeKey,
          name: parsed.data.newTypeName,
        },
      });
      resourceTypeId = type.id;
    }
    if (!resourceTypeId) return jsonError("resourceTypeId or new type required");

    const resource = await prisma.resource.create({
      data: {
        organizationId: orgId,
        locationId: parsed.data.locationId,
        resourceTypeId,
        inventoryCode: parsed.data.inventoryCode,
        name: parsed.data.name,
        status: (parsed.data.status as ResourceStatus) ?? ResourceStatus.AVAILABLE,
        attributes: parsed.data.attributes as never,
      },
      include: { resourceType: true, location: true },
    });
    return NextResponse.json({ data: resource }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requirePermission("resources.write");
    const body = await request.json();
    const id = z.string().parse(body.id);
    const resource = await prisma.resource.update({
      where: { id },
      data: {
        name: body.name,
        status: body.status,
        attributes: body.attributes,
      },
      include: { resourceType: true, location: true },
    });
    return NextResponse.json({ data: resource });
  } catch (error) {
    return handleError(error);
  }
}
