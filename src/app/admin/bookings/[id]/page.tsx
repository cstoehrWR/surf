import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/card";
import { CheckinButton } from "@/components/admin/checkin-button";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      participants: { include: { sessions: true, waivers: true } },
      items: { include: { session: { include: { product: true } } } },
      payments: true,
      statusHistory: true,
    },
  });
  if (!booking) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">{booking.number}</h1>
      <div className="flex gap-2">
        <Badge>{booking.status}</Badge>
        <Badge tone="amber">{booking.paymentStatus}</Badge>
      </div>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <p>
          {booking.customer.firstName} {booking.customer.lastName} · {booking.customer.email}
        </p>
        <p className="font-semibold">{formatMoney(Number(booking.total))} · bezahlt {formatMoney(Number(booking.amountPaid))}</p>
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Teilnehmer</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {booking.participants.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span>
                {p.firstName} {p.lastName} · Level {p.surfLevel} · Waiver {p.waivers.length ? "ja" : "nein"}
              </span>
              <CheckinButton bookingId={booking.id} participantId={p.id} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
