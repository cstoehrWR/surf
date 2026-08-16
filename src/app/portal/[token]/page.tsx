import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { PortalClient } from "@/components/portal/portal-client";
import { getPortalBooking, openAmount, getCancellationInfo } from "@/lib/portal/service";
import { getRequiredWaivers } from "@/lib/waiver/service";

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const booking = await getPortalBooking(token);
  if (!booking) notFound();
  const session = booking.items.find((i) => i.session)?.session;
  const cancellation = await getCancellationInfo(booking.id);
  const waivers = await getRequiredWaivers(token);

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        {sp.paid && (
          <p className="mb-4 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
            Zahlung erfolgreich verbucht.
          </p>
        )}
        <PortalClient
          token={token}
          booking={{
            id: booking.id,
            number: booking.number,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            total: Number(booking.total),
            amountPaid: Number(booking.amountPaid),
            openAmount: openAmount(booking),
            locked: ["CANCELLED", "COMPLETED"].includes(booking.status),
          }}
          participants={booking.participants.map((p) => ({
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            age: p.age,
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString() : null,
            heightCm: p.heightCm,
            weightKg: p.weightKg ? Number(p.weightKg) : null,
            surfLevel: p.surfLevel,
            wetsuitSize: p.wetsuitSize,
            shoeSize: p.shoeSize,
            canSwim: p.canSwim,
            notes: p.notes,
          }))}
          cancellation={{
            allowed: cancellation.allowed,
            hours: cancellation.hours,
            deadline: cancellation.deadline?.toISOString() ?? null,
            reason: cancellation.reason,
          }}
          waivers={waivers}
          sessionLabel={session ? `${session.product.name} · ${session.location.name}` : "Buchung"}
          sessionWhen={
            session
              ? session.startsAt.toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short" })
              : ""
          }
        />
        <section className="mt-6 rounded-2xl bg-white p-6 text-sm shadow-sm">
          <h2 className="font-semibold">Unterlagen</h2>
          <ul className="mt-2 list-disc pl-5 text-slate-600">
            <li>Buchungsnummer {booking.number}</li>
            <li>Zahlungen: {booking.payments.length}</li>
            <li>Rechnungen: {booking.invoices.length || "noch keine"}</li>
            <li>
              <a className="underline" href="/legal/agb">
                AGB
              </a>{" "}
              ·{" "}
              <a className="underline" href="/legal/datenschutz">
                Datenschutz
              </a>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
