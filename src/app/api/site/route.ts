import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requireTenant } from "@/lib/api/guard";
import { ensureSiteForOrganization } from "@/lib/site/service";
import type { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const { user, organizationId } = await requireTenant("settings.manage");
    const orgId = organizationId ?? user.organizationId;
    if (!orgId) return jsonError("Organization required");
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    await ensureSiteForOrganization({
      organizationId: orgId,
      name: org.name,
      tagline: org.tagline,
      contactEmail: user.email ?? undefined,
    });
    const site = await prisma.siteSettings.findUniqueOrThrow({
      where: { organizationId: orgId },
    });
    const pages = await prisma.sitePage.findMany({
      where: { organizationId: orgId },
      include: { blocks: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({
      data: {
        site,
        pages,
        publicUrl: site.customDomain ? `https://${site.customDomain}` : `/o/${org.slug}`,
        platformUrl: `/o/${org.slug}`,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

const settingsSchema = z.object({
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  logoUrl: z.string().optional().nullable(),
  heroImageUrl: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  socialInstagram: z.string().optional().nullable(),
  socialFacebook: z.string().optional().nullable(),
  footerText: z.string().optional().nullable(),
  showBookingCta: z.boolean().optional(),
  published: z.boolean().optional(),
  customDomain: z.string().optional().nullable(),
});

export async function PATCH(request: NextRequest) {
  try {
    const { user, organizationId } = await requireTenant("settings.manage");
    const orgId = organizationId ?? user.organizationId;
    if (!orgId) return jsonError("Organization required");
    const body = await request.json();

    if (body.action === "updatePage") {
      const pageId = z.string().parse(body.pageId);
      const page = await prisma.sitePage.update({
        where: { id: pageId },
        data: {
          title: body.title,
          navLabel: body.navLabel,
          published: body.published,
          showInNav: body.showInNav,
        },
      });
      return NextResponse.json({ data: page });
    }

    if (body.action === "updateBlock") {
      const blockId = z.string().parse(body.blockId);
      const block = await prisma.siteBlock.update({
        where: { id: blockId },
        data: {
          content: body.content as Prisma.InputJsonValue,
          type: body.type,
        },
      });
      return NextResponse.json({ data: block });
    }

    if (body.action === "addBlock") {
      const pageId = z.string().parse(body.pageId);
      const type = String(body.type ?? "TEXT");
      const { BLOCK_TEMPLATES } = await import("@/lib/site/domain");
      const count = await prisma.siteBlock.count({ where: { pageId } });
      const block = await prisma.siteBlock.create({
        data: {
          pageId,
          type,
          sortOrder: count,
          content: (body.content ?? BLOCK_TEMPLATES[type] ?? BLOCK_TEMPLATES.TEXT) as Prisma.InputJsonValue,
        },
      });
      return NextResponse.json({ data: block }, { status: 201 });
    }

    if (body.action === "moveBlock") {
      const blockId = z.string().parse(body.blockId);
      const direction = z.enum(["up", "down"]).parse(body.direction);
      const block = await prisma.siteBlock.findUniqueOrThrow({ where: { id: blockId } });
      const siblings = await prisma.siteBlock.findMany({
        where: { pageId: block.pageId },
        orderBy: { sortOrder: "asc" },
      });
      const idx = siblings.findIndex((b) => b.id === blockId);
      const swapWith = direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= siblings.length) {
        return NextResponse.json({ data: block });
      }
      const other = siblings[swapWith];
      await prisma.$transaction([
        prisma.siteBlock.update({ where: { id: block.id }, data: { sortOrder: other.sortOrder } }),
        prisma.siteBlock.update({ where: { id: other.id }, data: { sortOrder: block.sortOrder } }),
      ]);
      return NextResponse.json({ data: { ok: true } });
    }

    if (body.action === "deleteBlock") {
      const blockId = z.string().parse(body.blockId);
      await prisma.siteBlock.delete({ where: { id: blockId } });
      return NextResponse.json({ data: { ok: true } });
    }

    if (body.action === "addPage") {
      const slug = z.string().min(2).regex(/^[a-z0-9-]+$/).parse(body.slug);
      const page = await prisma.sitePage.create({
        data: {
          organizationId: orgId,
          slug,
          title: body.title ?? slug,
          navLabel: body.navLabel ?? body.title ?? slug,
          sortOrder: body.sortOrder ?? 50,
          showInNav: body.showInNav ?? true,
          blocks: {
            create: [
              {
                type: "TEXT",
                sortOrder: 0,
                content: { title: body.title ?? slug, body: "Inhalt hier bearbeiten." },
              },
            ],
          },
        },
        include: { blocks: true },
      });
      return NextResponse.json({ data: page }, { status: 201 });
    }

    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const data = { ...parsed.data };
    if (typeof data.customDomain === "string") {
      data.customDomain = data.customDomain
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "")
        .replace(/^www\./, "");
      if (!data.customDomain) data.customDomain = null;
    }
    const site = await prisma.siteSettings.update({
      where: { organizationId: orgId },
      data: data,
    });
    return NextResponse.json({ data: site });
  } catch (error) {
    return handleError(error);
  }
}
