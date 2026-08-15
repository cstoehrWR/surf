import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

export type SessionUser = {
  id: string;
  role: Role;
  organizationId?: string | null;
};

/** Resolve the active tenant for staff APIs. SUPER_ADMIN may omit filter (null = all). */
export async function resolveOrganizationId(
  user: SessionUser,
  preferredOrgId?: string | null,
): Promise<string | null> {
  if (user.role === Role.SUPER_ADMIN) {
    return preferredOrgId ?? user.organizationId ?? null;
  }
  const orgId = preferredOrgId ?? user.organizationId;
  if (!orgId) throw new Error("FORBIDDEN");

  const membership = await prisma.organizationMembership.findUnique({
    where: {
      organizationId_userId: { organizationId: orgId, userId: user.id },
    },
  });
  if (membership || user.organizationId === orgId) return orgId;
  throw new Error("FORBIDDEN");
}

export function orgWhere(organizationId: string | null) {
  return organizationId ? { organizationId } : {};
}

export async function listMemberships(userId: string) {
  return prisma.organizationMembership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { organization: { name: "asc" } },
  });
}

export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findFirst({
    where: { slug, active: true },
  });
}
