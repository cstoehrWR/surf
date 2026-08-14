import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError, requirePermission } from "@/lib/api/guard";
import { BookingStatus, PaymentStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("reports.read");
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const format = url.searchParams.get("format");
    const range = {
      gte: from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1),
      lte: to ? new Date(to) : new Date(),
    };

    const bookings = await prisma.booking.findMany({
      where: { createdAt: range, status: { not: BookingStatus.CANCELLED } },
      include: { items: { include: { product: true } }, location: true },
    });

    const byProduct: Record<string, number> = {};
    const byLocation: Record<string, number> = {};
    let revenue = 0;
    for (const b of bookings) {
      const total = Number(b.amountPaid);
      revenue += total;
      byLocation[b.location.name] = (byLocation[b.location.name] ?? 0) + total;
      for (const item of b.items) {
        byProduct[item.product.name] = (byProduct[item.product.name] ?? 0) + Number(item.lineTotal);
      }
    }

    const cancelled = await prisma.booking.count({
      where: { createdAt: range, status: BookingStatus.CANCELLED },
    });
    const noShows = await prisma.booking.count({
      where: { createdAt: range, status: BookingStatus.NO_SHOW },
    });
    const openPayments = await prisma.booking.aggregate({
      where: { paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID] } },
      _sum: { total: true },
      _count: true,
    });

    const report = {
      revenue,
      byProduct,
      byLocation,
      bookings: bookings.length,
      cancelled,
      noShows,
      openPayments: {
        count: openPayments._count,
        amount: Number(openPayments._sum.total ?? 0),
      },
    };

    if (format === "csv") {
      const lines = ["metric,value", `revenue,${revenue}`, `bookings,${bookings.length}`, `cancelled,${cancelled}`];
      return new NextResponse(lines.join("\n"), {
        headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=report.csv" },
      });
    }
    return NextResponse.json({ data: report });
  } catch (error) {
    return handleError(error);
  }
}
