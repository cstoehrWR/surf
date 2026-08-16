import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BookingMode, ProductType, SportType, SurfLevel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { handleError, jsonError, rateLimit, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";

export async function GET(request: NextRequest) {
  if (!rateLimit(request.headers.get("x-forwarded-for") ?? "products", 120)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId") ?? undefined;
  const organizationId = searchParams.get("organizationId") ?? undefined;
  const orgSlug = searchParams.get("org") ?? undefined;
  const sportType = searchParams.get("sportType") ?? undefined;
  const bookingMode = searchParams.get("bookingMode") ?? undefined;
  const admin = searchParams.get("admin") === "1";

  let orgId = organizationId;
  if (!orgId && orgSlug) {
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug, active: true } });
    orgId = org?.id;
  }

  if (admin) {
    const { organizationId: tenantId } = await requireTenant("products.read");
    orgId = organizationId ?? tenantId ?? orgId;
  }

  const products = await prisma.product.findMany({
    where: {
      ...(admin ? {} : { published: true }),
      ...(locationId ? { locationId } : {}),
      ...(orgId ? { organizationId: orgId } : {}),
      ...(sportType ? { sportType: sportType as SportType } : {}),
      ...(bookingMode ? { bookingMode: bookingMode as BookingMode } : {}),
      ...(admin && orgId ? orgWhere(orgId) : {}),
    },
    include: { variants: true, images: true, location: true, requirements: { include: { resourceType: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    data: products.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
      taxRate: Number(p.taxRate),
      variants: p.variants.map((v) => ({ ...v, price: Number(v.price) })),
    })),
  });
}

const productSchema = z.object({
  locationId: z.string(),
  type: z.enum([
    "GROUP_COURSE",
    "PRIVATE_COURSE",
    "MULTI_DAY_COURSE",
    "SURF_CAMP",
    "RENTAL",
    "ADDON",
    "VOUCHER",
    "PACKAGE",
    "ACCOMMODATION",
    "CAMPING",
  ]),
  sportType: z.enum(["SURF", "KITE", "SUP", "WINDSURF", "OTHER"]).default("SURF"),
  bookingMode: z.enum(["SESSION", "NIGHTLY"]).default("SESSION"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  description: z.string().min(2),
  category: z.string().default("Kurse"),
  durationMinutes: z.coerce.number().int().min(15).default(120),
  basePrice: z.coerce.number().positive(),
  taxRate: z.coerce.number().optional(),
  minParticipants: z.coerce.number().int().min(1).optional(),
  maxParticipants: z.coerce.number().int().min(1).optional(),
  minAge: z.coerce.number().int().optional().nullable(),
  surfLevel: z.enum(["NONE", "BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO"]).optional(),
  bookingLeadHours: z.coerce.number().int().optional(),
  instructorRatio: z.coerce.number().int().optional(),
  weekdays: z.array(z.coerce.number().int()).optional(),
  startTimes: z.array(z.string()).optional(),
  seasonStart: z.string().optional().nullable(),
  seasonEnd: z.string().optional().nullable(),
  published: z.boolean().optional(),
  variants: z
    .array(z.object({ name: z.string(), price: z.coerce.number().positive() }))
    .optional(),
  requirementTypeIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await requireTenant("products.write");
    const orgId = organizationId ?? user.organizationId;
    if (!orgId) return jsonError("Organization required", 400);
    const parsed = productSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    const product = await prisma.product.create({
      data: {
        organizationId: orgId,
        locationId: parsed.data.locationId,
        type: parsed.data.type as ProductType,
        sportType: parsed.data.sportType as SportType,
        bookingMode: parsed.data.bookingMode as BookingMode,
        slug: parsed.data.slug,
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        durationMinutes: parsed.data.durationMinutes,
        basePrice: parsed.data.basePrice,
        taxRate: parsed.data.taxRate ?? 19,
        minParticipants: parsed.data.minParticipants ?? 1,
        maxParticipants: parsed.data.maxParticipants ?? 8,
        minAge: parsed.data.minAge ?? null,
        surfLevel: (parsed.data.surfLevel as SurfLevel) ?? SurfLevel.BEGINNER,
        bookingLeadHours: parsed.data.bookingLeadHours ?? 2,
        instructorRatio: parsed.data.instructorRatio ?? 8,
        weekdays: parsed.data.weekdays ?? [0, 1, 2, 3, 4, 5, 6],
        startTimes: parsed.data.startTimes ?? ["10:00"],
        seasonStart: parsed.data.seasonStart ? new Date(parsed.data.seasonStart) : null,
        seasonEnd: parsed.data.seasonEnd ? new Date(parsed.data.seasonEnd) : null,
        published: parsed.data.published ?? true,
        variants: parsed.data.variants?.length
          ? { create: parsed.data.variants }
          : undefined,
        requirements: parsed.data.requirementTypeIds?.length
          ? {
              create: parsed.data.requirementTypeIds.map((resourceTypeId) => ({
                resourceTypeId,
                quantityPerParticipant: 1,
              })),
            }
          : undefined,
      },
      include: { variants: true, location: true },
    });
    return NextResponse.json(
      {
        data: {
          ...product,
          basePrice: Number(product.basePrice),
          taxRate: Number(product.taxRate),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}
