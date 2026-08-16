import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { orgWhere } from "@/lib/tenant/org";

/** Tenant scope for Admin RSC pages (org switcher → session.user.organizationId). */
export async function requireAdminOrg() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const organizationId = session.user.organizationId ?? null;
  return {
    session,
    organizationId,
    where: orgWhere(organizationId),
  };
}
