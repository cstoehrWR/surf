import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/card";
import { AttendanceToggle } from "@/components/admin/attendance-toggle";
import { MaterialPanel } from "@/components/admin/material-panel";
import { CheckinButton } from "@/components/admin/checkin-button";
import { SessionStatusActions } from "@/components/admin/session-status-actions";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await prisma.courseSession.findUnique({
    where: { id },
    include: {
      product: true,
      location: true,
      instructors: { include: { instructor: true } },
      participants: {
        include: {
          participant: { include: { waivers: true } },
          booking: { include: { customer: true, payments: true } },
          resources: { include: { resource: true } },
        },
      },
    },
  });
  if (!session) notFound();

  const paidCount = session.participants.filter((p) => p.booking.paymentStatus === "PAID").length;
  const waiverMissing = session.participants.filter((p) => p.participant.waivers.length === 0).length;
  const checkedIn = session.participants.filter((p) => p.attendance).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">{session.product.name}</h1>
        <p>
          {session.startsAt.toLocaleString("de-DE")} · {session.location.name} ·{" "}
          {session.instructors.map((i) => i.instructor.firstName).join(", ")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{session.status}</Badge>
          <Badge tone="slate">
            Check-in {checkedIn}/{session.participants.length}
          </Badge>
          <Badge tone={paidCount === session.participants.length ? "teal" : "amber"}>
            Bezahlt {paidCount}/{session.participants.length}
          </Badge>
          <Badge tone={waiverMissing ? "rose" : "teal"}>
            Waiver offen {waiverMissing}
          </Badge>
        </div>
      </div>

      <SessionStatusActions sessionId={session.id} status={session.status} />

      <section className="overflow-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Teilnehmer</th>
              <th className="p-3">Bezahlt</th>
              <th className="p-3">Daten</th>
              <th className="p-3">Waiver</th>
              <th className="p-3 min-w-64">Material</th>
              <th className="p-3">Check-in</th>
            </tr>
          </thead>
          <tbody>
            {session.participants.map((p) => (
              <tr key={p.id} className="border-t align-top">
                <td className="p-3">
                  {p.participant.firstName} {p.participant.lastName}
                  <div className="text-xs text-slate-500">
                    Level {p.participant.surfLevel}
                    {p.participant.notes ? ` · ${p.participant.notes}` : ""}
                  </div>
                  <div className="text-xs text-slate-500">{p.booking.customer.email}</div>
                </td>
                <td className="p-3">{p.booking.paymentStatus === "PAID" ? "ja" : "nein"}</td>
                <td className="p-3">{p.participant.wetsuitSize ? "vollständig" : "unvollständig"}</td>
                <td className="p-3">{p.participant.waivers.length ? "ja" : "nein"}</td>
                <td className="p-3">
                  <MaterialPanel
                    sessionParticipantId={p.id}
                    locationId={session.locationId}
                    assignments={p.resources.map((r) => ({
                      id: r.id,
                      returnedAt: r.returnedAt ? r.returnedAt.toISOString() : null,
                      damageNote: r.damageNote,
                      resource: { id: r.resource.id, inventoryCode: r.resource.inventoryCode },
                    }))}
                  />
                </td>
                <td className="p-3 space-y-2">
                  <AttendanceToggle id={p.id} initial={p.attendance} />
                  <CheckinButton bookingId={p.bookingId} participantId={p.participantId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
