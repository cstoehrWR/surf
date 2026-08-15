import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError, requireTenant } from "@/lib/api/guard";
import { BookingStatus, PaymentStatus, SessionStatus } from "@prisma/client";
import { orgWhere } from "@/lib/tenant/org";

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await requireTenant("reports.read");
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const format = url.searchParams.get("format");
    const range = {
      gte: from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1),
      lte: to ? new Date(to) : new Date(),
    };
    const scope = orgWhere(organizationId);

    const bookings = await prisma.booking.findMany({
      where: { ...scope, createdAt: range, status: { not: BookingStatus.CANCELLED } },
      include: {
        items: { include: { product: true, session: { include: { instructors: { include: { instructor: true } } } } } },
        location: true,
      },
    });

    const byProduct: Record<string, number> = {};
    const byLocation: Record<string, number> = {};
    const byInstructor: Record<string, number> = {};
    let revenue = 0;
    for (const b of bookings) {
      const total = Number(b.amountPaid);
      revenue += total;
      byLocation[b.location.name] = (byLocation[b.location.name] ?? 0) + total;
      for (const item of b.items) {
        byProduct[item.product.name] = (byProduct[item.product.name] ?? 0) + Number(item.lineTotal);
        for (const link of item.session?.instructors ?? []) {
          const name = `${link.instructor.firstName} ${link.instructor.lastName}`;
          byInstructor[name] = (byInstructor[name] ?? 0) + Number(item.lineTotal);
        }
      }
    }

    const cancelled = await prisma.booking.count({
      where: { ...scope, createdAt: range, status: BookingStatus.CANCELLED },
    });
    const noShows = await prisma.booking.count({
      where: { ...scope, createdAt: range, status: BookingStatus.NO_SHOW },
    });
    const openPayments = await prisma.booking.aggregate({
      where: {
        ...scope,
        paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID] },
      },
      _sum: { total: true },
      _count: true,
    });
    const sessions = await prisma.courseSession.findMany({
      where: { ...scope, startsAt: range, status: { not: SessionStatus.CANCELLED } },
      include: { participants: true, product: true },
    });
    const occupancyByProduct: Record<string, { booked: number; capacity: number; pct: number }> = {};
    for (const s of sessions) {
      const key = s.product.name;
      const cur = occupancyByProduct[key] ?? { booked: 0, capacity: 0, pct: 0 };
      cur.booked += s.participants.length;
      cur.capacity += s.maxParticipants;
      occupancyByProduct[key] = cur;
    }
    for (const key of Object.keys(occupancyByProduct)) {
      const cur = occupancyByProduct[key];
      cur.pct = cur.capacity ? Math.round((cur.booked / cur.capacity) * 100) : 0;
    }
    const waitlist = await prisma.waitlistEntry.count({ where: { ...scope, createdAt: range } });

    const report = {
      revenue,
      byProduct,
      byLocation,
      byInstructor,
      occupancyByProduct,
      bookings: bookings.length,
      cancelled,
      noShows,
      waitlist,
      openPayments: {
        count: openPayments._count,
        amount: Number(openPayments._sum.total ?? 0),
      },
    };

    if (format === "csv") {
      const lines = [
        "metric,key,value",
        `revenue,,${revenue}`,
        `bookings,,${bookings.length}`,
        `cancelled,,${cancelled}`,
        `noShows,,${noShows}`,
        `waitlist,,${waitlist}`,
        ...Object.entries(byProduct).map(([k, v]) => `byProduct,${JSON.stringify(k)},${v}`),
        ...Object.entries(byLocation).map(([k, v]) => `byLocation,${JSON.stringify(k)},${v}`),
        ...Object.entries(byInstructor).map(([k, v]) => `byInstructor,${JSON.stringify(k)},${v}`),
        ...Object.entries(occupancyByProduct).map(
          ([k, v]) => `occupancy,${JSON.stringify(k)},${v.pct}`,
        ),
      ];
      return new NextResponse(lines.join("\n"), {
        headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=report.csv" },
      });
    }
    return NextResponse.json({ data: report });
  } catch (error) {
    return handleError(error);
  }
}
