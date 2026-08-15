import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SportType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requirePermission, requireTenant } from "@/lib/api/guard";
import { listMemberships, orgWhere } from "@/lib/tenant/org";

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("products.read");
    const mine = new URL(request.url).searchParams.get("mine");
    if (mine === "1") {
      const memberships = await listMemberships(user.id);
      if (user.role === "SUPER_ADMIN") {
        const all = await prisma.organization.findMany({ where: { active: true }, orderBy: { name: "asc" } });
        return NextResponse.json({
          data: all.map((o) => ({
            organizationId: o.id,
            role: "SUPER_ADMIN",
            organization: o,
          })),
        });
      }
      return NextResponse.json({ data: memberships });
    }
    const { organizationId } = await requireTenant("products.read");
    const data = await prisma.organization.findMany({
      where: { active: true, ...orgWhere(organizationId) },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  tagline: z.string().optional(),
  sports: z.array(z.enum(["SURF", "KITE", "SUP", "WINDSURF", "OTHER"])).optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("settings.manage");
    const body = await request.json();
    if (body.action === "switch") {
      const organizationId = z.string().parse(body.organizationId);
      if (user.role !== "SUPER_ADMIN") {
        const membership = await prisma.organizationMembership.findUnique({
          where: { organizationId_userId: { organizationId, userId: user.id } },
        });
        if (!membership) return jsonError("Forbidden", 403);
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { organizationId },
      });
      return NextResponse.json({ data: { organizationId } });
    }

    if (user.role !== "SUPER_ADMIN") return jsonError("Forbidden", 403);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const org = await prisma.organization.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        tagline: parsed.data.tagline,
        sports: (parsed.data.sports as SportType[]) ?? [SportType.SURF],
        locale: parsed.data.locale ?? "de",
        timezone: parsed.data.timezone ?? "Europe/Berlin",
        currency: parsed.data.currency ?? "EUR",
        memberships: {
          create: { userId: user.id, role: "SUPER_ADMIN" },
        },
      },
    });
    return NextResponse.json({ data: org }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
