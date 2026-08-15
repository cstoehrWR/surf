import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BookingStatus, PaymentStatus, SessionStatus } from "@prisma/client";
import { formatMoney } from "@/lib/utils";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "reports.read")) redirect("/admin");
  const sp = await searchParams;
  const from = sp.from ? new Date(sp.from) : new Date(new Date().getFullYear(), 0, 1);
  const to = sp.to ? new Date(sp.to) : new Date();
  const range = { gte: from, lte: to };

  const bookings = await prisma.booking.findMany({
    where: { createdAt: range, status: { not: BookingStatus.CANCELLED } },
    include: {
      items: { include: { product: true, session: { include: { instructors: { include: { instructor: true } } } } } },
      location: true,
    },
  });
  const revenue = bookings.reduce((s, b) => s + Number(b.amountPaid), 0);
  const byProduct: Record<string, number> = {};
  const byLocation: Record<string, number> = {};
  const byInstructor: Record<string, number> = {};
  for (const b of bookings) {
    byLocation[b.location.name] = (byLocation[b.location.name] ?? 0) + Number(b.amountPaid);
    for (const item of b.items) {
      byProduct[item.product.name] = (byProduct[item.product.name] ?? 0) + Number(item.lineTotal);
      for (const link of item.session?.instructors ?? []) {
        const name = `${link.instructor.firstName} ${link.instructor.lastName}`;
        byInstructor[name] = (byInstructor[name] ?? 0) + Number(item.lineTotal);
      }
    }
  }
  const cancelled = await prisma.booking.count({
    where: { createdAt: range, status: BookingStatus.CANCELLED },
  });
  const noShows = await prisma.booking.count({
    where: { createdAt: range, status: BookingStatus.NO_SHOW },
  });
  const open = await prisma.booking.count({
    where: { paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID] } },
  });
  const sessions = await prisma.courseSession.findMany({
    where: { startsAt: range, status: { not: SessionStatus.CANCELLED } },
    include: { participants: true, product: true },
  });
  const occupancyByProduct: Record<string, { booked: number; capacity: number }> = {};
  for (const s of sessions) {
    const key = s.product.name;
    const cur = occupancyByProduct[key] ?? { booked: 0, capacity: 0 };
    cur.booked += s.participants.length;
    cur.capacity += s.maxParticipants;
    occupancyByProduct[key] = cur;
  }
  const waitlist = await prisma.waitlistEntry.count({ where: { createdAt: range } });
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Reports</h1>
        <a
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
          href={`/api/reports?format=csv&from=${fromStr}&to=${toStr}`}
        >
          CSV export
        </a>
      </div>
      <form className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <label className="text-sm">
          Von
          <input className="ml-2 rounded border px-2 py-1" type="date" name="from" defaultValue={fromStr} />
        </label>
        <label className="text-sm">
          Bis
          <input className="ml-2 rounded border px-2 py-1" type="date" name="to" defaultValue={toStr} />
        </label>
        <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">
          Filtern
        </button>
      </form>
      <div className="grid gap-3 md:grid-cols-5">
        <Stat label="Umsatz" value={formatMoney(revenue)} />
        <Stat label="Buchungen" value={String(bookings.length)} />
        <Stat label="Stornierungen" value={String(cancelled)} />
        <Stat label="No-Shows" value={String(noShows)} />
        <Stat label="Warteliste" value={String(waitlist)} />
      </div>
      <Stat label="offene Zahlungen" value={String(open)} />
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Auslastung pro Produkt</h2>
        {Object.entries(occupancyByProduct).map(([k, v]) => (
          <p key={k} className="flex justify-between text-sm">
            <span>{k}</span>
            <span>
              {v.booked}/{v.capacity} ({v.capacity ? Math.round((v.booked / v.capacity) * 100) : 0} %)
            </span>
          </p>
        ))}
        {Object.keys(occupancyByProduct).length === 0 && <p className="text-sm text-slate-500">Keine Sessions</p>}
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Umsatz pro Produkt</h2>
        {Object.entries(byProduct).map(([k, v]) => (
          <p key={k} className="flex justify-between text-sm">
            <span>{k}</span>
            <span>{formatMoney(v)}</span>
          </p>
        ))}
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Umsatz pro Standort</h2>
        {Object.entries(byLocation).map(([k, v]) => (
          <p key={k} className="flex justify-between text-sm">
            <span>{k}</span>
            <span>{formatMoney(v)}</span>
          </p>
        ))}
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Umsatz pro Surflehrer</h2>
        {Object.entries(byInstructor).map(([k, v]) => (
          <p key={k} className="flex justify-between text-sm">
            <span>{k}</span>
            <span>{formatMoney(v)}</span>
          </p>
        ))}
        {Object.keys(byInstructor).length === 0 && <p className="text-sm text-slate-500">Keine Zuordnung</p>}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
