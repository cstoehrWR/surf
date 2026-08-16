import { prisma } from "@/lib/db";
import { BookingStatus, PaymentStatus, ResourceStatus } from "@prisma/client";
import { endOfDay, formatMoney, startOfDay } from "@/lib/utils";
import { requireAdminOrg } from "@/lib/tenant/admin-scope";
import Link from "next/link";

export default async function AdminDashboard() {
  const { where } = await requireAdminOrg();

  const from = startOfDay(new Date());
  const to = endOfDay(new Date());
  const sessions = await prisma.courseSession.findMany({
    where: { ...where, startsAt: { gte: from, lte: to }, status: { not: "CANCELLED" } },
    include: {
      product: true,
      location: true,
      instructors: { include: { instructor: true } },
      participants: { include: { participant: { include: { waivers: true } }, booking: true } },
    },
    orderBy: { startsAt: "asc" },
  });
  const participantCount = sessions.reduce((s, x) => s + x.participants.length, 0);
  const capacity = sessions.reduce((s, x) => s + x.maxParticipants, 0);
  const occupancy = capacity ? Math.round((participantCount / capacity) * 100) : 0;
  const todaysBookings = await prisma.booking.findMany({
    where: {
      ...where,
      items: { some: { session: { startsAt: { gte: from, lte: to } } } },
      status: { not: BookingStatus.CANCELLED },
    },
  });
  const revenue = todaysBookings.reduce((s, b) => s + Number(b.amountPaid), 0);
  const openPayments = todaysBookings.filter(
    (b) => b.paymentStatus === PaymentStatus.UNPAID || b.paymentStatus === PaymentStatus.PARTIALLY_PAID,
  ).length;
  const missingWaivers = sessions.flatMap((s) => s.participants).filter((p) => p.participant.waivers.length === 0).length;
  const missingData = sessions.flatMap((s) => s.participants).filter((p) => !p.participant.wetsuitSize).length;
  const resourceIssues = await prisma.resource.count({
    where: {
      ...where,
      status: { in: [ResourceStatus.DEFECT, ResourceStatus.MAINTENANCE, ResourceStatus.LOST] },
    },
  });
  const upcoming = await prisma.booking.findMany({
    where: { ...where, status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] } },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  const cancellations = await prisma.booking.findMany({
    where: { ...where, status: BookingStatus.CANCELLED },
    include: { customer: true },
    take: 4,
    orderBy: { updatedAt: "desc" },
  });
  const waitlist = await prisma.waitlistEntry.count({ where });

  const kpis = [
    { label: "Sessions", value: String(sessions.length) },
    { label: "Teilnehmer", value: String(participantCount) },
    { label: "Auslastung", value: `${occupancy} %` },
    { label: "Umsatz", value: formatMoney(revenue) },
    { label: "offene Zahlungen", value: String(openPayments) },
    { label: "fehlende Waiver", value: String(missingWaivers) },
    { label: "fehlende Teilnehmerdaten", value: String(missingData) },
    { label: "Ressourcenprobleme", value: String(resourceIssues) },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-wide text-teal-700">Heute</p>
        <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className="mt-2 text-3xl font-semibold text-teal-900">{k.value}</p>
          </div>
        ))}
      </div>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Sessions heute</h2>
        <div className="mt-3 divide-y">
          {sessions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span className="font-medium">
                {s.startsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}–
                {s.endsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} {s.product.name}
              </span>
              <span>
                {s.participants.length}/{s.maxParticipants} · {s.instructors.map((i) => i.instructor.firstName).join(", ")} · {s.location.name}
              </span>
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        <Box title="Kommende Buchungen">
          {upcoming.map((b) => (
            <p key={b.id} className="flex justify-between py-1 text-sm">
              <Link className="text-teal-800 underline" href={`/admin/bookings/${b.id}`}>
                {b.number}
              </Link>
              <Link href={`/admin/customers/${b.customerId}`}>{b.customer.lastName}</Link>
            </p>
          ))}
        </Box>
        <Box title="Stornierungen">
          {cancellations.length === 0 && <p className="text-sm text-slate-500">Keine</p>}
          {cancellations.map((b) => (
            <p key={b.id} className="text-sm">
              {b.number} · {b.customer.lastName}
            </p>
          ))}
        </Box>
        <Box title="Warteliste">
          <p className="text-3xl font-semibold">{waitlist}</p>
          <p className="text-sm text-slate-500">Einträge</p>
          <a className="mt-2 inline-block text-sm text-teal-800 underline" href="/admin/waitlist">
            Verwalten
          </a>
        </Box>
      </div>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
