import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { formatMoney } from "@/lib/utils";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/card";

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await prisma.booking.findUnique({
    where: { accessToken: token },
    include: {
      items: { include: { session: { include: { product: true, location: true } } } },
      participants: { include: { waivers: true } },
      payments: true,
      invoices: true,
    },
  });
  if (!booking) notFound();
  const session = booking.items.find((i) => i.session)?.session;

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Deine Buchung {booking.number}</h1>
        <div className="mt-4 flex gap-2">
          <Badge>{booking.status}</Badge>
          <Badge tone={booking.paymentStatus === "PAID" ? "teal" : "amber"}>{booking.paymentStatus}</Badge>
        </div>
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <p>
            {session?.product.name} · {session?.location.name}
          </p>
          <p className="text-slate-600">
            {session?.startsAt.toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short" })}
          </p>
          <p className="mt-2 font-semibold">{formatMoney(Number(booking.total))}</p>
        </section>
        <section className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Teilnehmer</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {booking.participants.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>
                  {p.firstName} {p.lastName}
                </span>
                <span>{p.waivers.length ? "Waiver vorhanden" : "Waiver fehlt"}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
