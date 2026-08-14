import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { formatMoney } from "@/lib/utils";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "reports.read")) redirect("/admin");
  const bookings = await prisma.booking.findMany({
    where: { status: { not: BookingStatus.CANCELLED } },
    include: { items: { include: { product: true } }, location: true },
  });
  const revenue = bookings.reduce((s, b) => s + Number(b.amountPaid), 0);
  const byProduct: Record<string, number> = {};
  const byLocation: Record<string, number> = {};
  for (const b of bookings) {
    byLocation[b.location.name] = (byLocation[b.location.name] ?? 0) + Number(b.amountPaid);
    for (const item of b.items) {
      byProduct[item.product.name] = (byProduct[item.product.name] ?? 0) + Number(item.lineTotal);
    }
  }
  const cancelled = await prisma.booking.count({ where: { status: BookingStatus.CANCELLED } });
  const noShows = await prisma.booking.count({ where: { status: BookingStatus.NO_SHOW } });
  const open = await prisma.booking.count({
    where: { paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID] } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Reports</h1>
        <a className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white" href="/api/reports?format=csv">
          CSV export
        </a>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Umsatz" value={formatMoney(revenue)} />
        <Stat label="Stornierungen" value={String(cancelled)} />
        <Stat label="No-Shows" value={String(noShows)} />
        <Stat label="offene Zahlungen" value={String(open)} />
      </div>
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
