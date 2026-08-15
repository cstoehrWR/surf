import { prisma } from "@/lib/db";
import { ResourceStatus } from "@prisma/client";
import { BookingError } from "@/lib/booking/service";

export async function assignResource(params: {
  sessionParticipantId: string;
  resourceId: string;
  actorUserId?: string;
}) {
  const participant = await prisma.sessionParticipant.findUniqueOrThrow({
    where: { id: params.sessionParticipantId },
    include: { session: true },
  });
  const resource = await prisma.resource.findUniqueOrThrow({
    where: { id: params.resourceId },
  });

  if (resource.locationId !== participant.session.locationId) {
    throw new BookingError("Resource at wrong location", "RESOURCE_LOCATION");
  }
  if (resource.status !== ResourceStatus.AVAILABLE) {
    throw new BookingError("Resource not available", "RESOURCE_UNAVAILABLE");
  }

  const openAssignment = await prisma.resourceAssignment.findFirst({
    where: { resourceId: resource.id, returnedAt: null },
  });
  if (openAssignment) {
    throw new BookingError("Resource already issued", "RESOURCE_ISSUED");
  }

  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.resourceAssignment.create({
      data: {
        resourceId: resource.id,
        sessionParticipantId: participant.id,
      },
      include: { resource: true },
    });
    await tx.resource.update({
      where: { id: resource.id },
      data: { status: ResourceStatus.ISSUED },
    });
    await tx.auditLog.create({
      data: {
        organizationId: resource.organizationId,
        userId: params.actorUserId,
        action: "resource.issued",
        entityType: "ResourceAssignment",
        entityId: created.id,
        newValue: { resourceId: resource.id, inventoryCode: resource.inventoryCode },
      },
    });
    return created;
  });

  return assignment;
}

export async function returnResource(params: {
  assignmentId: string;
  damageNote?: string;
  actorUserId?: string;
}) {
  const assignment = await prisma.resourceAssignment.findUniqueOrThrow({
    where: { id: params.assignmentId },
    include: { resource: true },
  });
  if (assignment.returnedAt) {
    throw new BookingError("Already returned", "ALREADY_RETURNED");
  }

  const damaged = Boolean(params.damageNote?.trim());
  return prisma.$transaction(async (tx) => {
    await tx.resourceAssignment.update({
      where: { id: assignment.id },
      data: {
        returnedAt: new Date(),
        damageNote: params.damageNote?.trim() || null,
      },
    });
    await tx.resource.update({
      where: { id: assignment.resourceId },
      data: { status: damaged ? ResourceStatus.DEFECT : ResourceStatus.AVAILABLE },
    });
    await tx.auditLog.create({
      data: {
        organizationId: assignment.resource.organizationId,
        userId: params.actorUserId,
        action: damaged ? "resource.damaged" : "resource.returned",
        entityType: "ResourceAssignment",
        entityId: assignment.id,
        newValue: { damageNote: params.damageNote ?? null, status: damaged ? "DEFECT" : "AVAILABLE" },
      },
    });
    return tx.resourceAssignment.findUniqueOrThrow({
      where: { id: assignment.id },
      include: { resource: true },
    });
  });
}

export async function listAssignableResources(params: {
  locationId: string;
  resourceTypeId?: string;
}) {
  return prisma.resource.findMany({
    where: {
      locationId: params.locationId,
      status: ResourceStatus.AVAILABLE,
      resourceTypeId: params.resourceTypeId,
    },
    include: { resourceType: true },
    orderBy: { inventoryCode: "asc" },
  });
}
