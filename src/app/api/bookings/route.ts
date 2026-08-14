import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/booking/service";
import { createBookingSchema } from "@/lib/validation/schemas";
import { handleError, jsonError, rateLimit, requireUser } from "@/lib/api/guard";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac/permissions";

export async function GET(request: NextRequest) {
  const user = await requireUser().catch(() => null);
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const number = url.searchParams.get("number");

  if (token) {
    const booking = await prisma.booking.findUnique({
      where: { accessToken: token },
      include: { items: true, participants: true, customer: true, payments: true },
    });
    if (!booking) return jsonError("Not found", 404);
    return NextResponse.json({ data: serializeBooking(booking) });
  }

  if (!user) return jsonError("Unauthorized", 401);
  const where = user.role === "CUSTOMER" ? { customer: { email: user.email ?? "" } } : {};
  const bookings = await prisma.booking.findMany({
    where,
    include: { customer: true, items: true, participants: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ data: bookings.map(serializeBooking) });
}

export async function POST(request: NextRequest) {
  if (!rateLimit(request.headers.get("x-forwarded-for") ?? "book", 20)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    let actorUserId: string | undefined;
    try {
      const user = await requireUser();
      actorUserId = user.id;
      if (parsed.data.overrideReason && !hasPermission(user.role, "bookings.override")) {
        return jsonError("Override not allowed", 403);
      }
    } catch {
      if (parsed.data.overrideReason) return jsonError("Override requires authentication", 401);
    }

    const booking = await createBooking({
      ...parsed.data,
      date: new Date(`${parsed.data.date}T00:00:00`),
      actorUserId,
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return NextResponse.json({ data: serializeBooking(booking) }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

function serializeBooking(booking: {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  total: unknown;
  subtotal: unknown;
  taxTotal: unknown;
  amountPaid: unknown;
  accessToken: string;
  [key: string]: unknown;
}) {
  return {
    ...booking,
    total: Number(booking.total),
    subtotal: Number(booking.subtotal),
    taxTotal: Number(booking.taxTotal),
    amountPaid: Number(booking.amountPaid),
  };
}
