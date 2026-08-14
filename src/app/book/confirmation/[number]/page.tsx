import Link from "next/link";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { formatMoney } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ paid?: string; token?: string }>;
}) {
  const { number } = await params;
  const booking = await prisma.booking.findUnique({
    where: { number },
    include: {
      customer: true,
      items: { include: { session: { include: { location: true, product: true } } } },
      participants: true,
    },
  });
  if (!booking) notFound();
  const session = booking.items.find((i) => i.session)?.session;

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-wide text-teal-700">Buchung bestätigt</p>
          <h1 className="mt-2 text-3xl font-semibold">{booking.number}</h1>
          <p className="mt-2 text-slate-600">
            Danke {booking.customer.firstName}. Wir haben eine Bestätigung an {booking.customer.email} gesendet.
          </p>
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Status</dt>
              <dd className="font-semibold">{booking.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Zahlung</dt>
              <dd className="font-semibold">{booking.paymentStatus}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Kurs</dt>
              <dd>{session?.product.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Termin</dt>
              <dd>
                {session?.startsAt.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Standort</dt>
              <dd>{session?.location.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Teilnehmer</dt>
              <dd>{booking.participants.map((p) => p.firstName).join(", ")}</dd>
            </div>
            <div className="flex justify-between text-base">
              <dt>Gesamt</dt>
              <dd className="font-bold">{formatMoney(Number(booking.total))}</dd>
            </div>
          </dl>
          <Link
            href={`/portal/${booking.accessToken}`}
            className="mt-6 inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Zum Kundenportal
          </Link>
        </div>
      </main>
    </div>
  );
}
