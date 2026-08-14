import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError, requirePermission } from "@/lib/api/guard";
import { BookingStatus, PaymentStatus, ResourceStatus } from "@prisma/client";
import { endOfDay, startOfDay } from "@/lib/utils";

export async function GET() {
  try {
    await requirePermission("sessions.read");
    const from = startOfDay(new Date());
    const to = endOfDay(new Date());

    const sessions = await prisma.courseSession.findMany({
      where: { startsAt: { gte: from, lte: to }, status: { not: "CANCELLED" } },
      include: {
        participants: { include: { participant: { include: { waivers: true } }, booking: true } },
        instructors: { include: { instructor: true } },
        product: true,
      },
    });

    const participantCount = sessions.reduce((s, x) => s + x.participants.length, 0);
    const capacity = sessions.reduce((s, x) => s + x.maxParticipants, 0);
    const occupancy = capacity ? Math.round((participantCount / capacity) * 100) : 0;

    const paidBookings = await prisma.booking.findMany({
      where: {
        items: { some: { session: { startsAt: { gte: from, lte: to } } } },
        status: { not: BookingStatus.CANCELLED },
      },
    });
    const revenue = paidBookings.reduce((s, b) => s + Number(b.amountPaid), 0);
    const openPayments = paidBookings.filter(
      (b) => b.paymentStatus === PaymentStatus.UNPAID || b.paymentStatus === PaymentStatus.PARTIALLY_PAID,
    ).length;

    const missingWaivers = sessions
      .flatMap((s) => s.participants)
      .filter((p) => p.participant.waivers.length === 0).length;

    const missingParticipantData = sessions
      .flatMap((s) => s.participants)
      .filter((p) => !p.participant.dateOfBirth || !p.participant.wetsuitSize).length;

    const resourceIssues = await prisma.resource.count({
      where: { status: { in: [ResourceStatus.DEFECT, ResourceStatus.MAINTENANCE, ResourceStatus.LOST] } },
    });

    const upcoming = await prisma.booking.findMany({
      where: { status: BookingStatus.CONFIRMED, createdAt: { gte: new Date(Date.now() - 86400000) } },
      include: { customer: true },
      take: 8,
      orderBy: { createdAt: "desc" },
    });
    const cancellations = await prisma.booking.findMany({
      where: { status: BookingStatus.CANCELLED },
      include: { customer: true },
      take: 5,
      orderBy: { updatedAt: "desc" },
    });
    const waitlist = await prisma.waitlistEntry.count();

    const instructorLoad = sessions.flatMap((s) =>
      s.instructors.map((i) => ({
        name: `${i.instructor.firstName} ${i.instructor.lastName}`,
        participants: s.participants.length,
        max: s.maxParticipants,
      })),
    );

    return NextResponse.json({
      data: {
        today: {
          sessions: sessions.length,
          participants: participantCount,
          occupancy,
          revenue,
          openPayments,
          missingWaivers,
          missingParticipantData,
          resourceIssues,
        },
        upcoming,
        cancellations,
        waitlist,
        instructorLoad,
        sessions,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
