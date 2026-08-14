import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/card";
import { AttendanceToggle } from "@/components/admin/attendance-toggle";

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
          booking: { include: { customer: true } },
          resources: { include: { resource: true } },
        },
      },
    },
  });
  if (!session) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">{session.product.name}</h1>
      <p>
        {session.startsAt.toLocaleString("de-DE")} · {session.location.name} ·{" "}
        {session.instructors.map((i) => i.instructor.firstName).join(", ")}
      </p>
      <Badge>{session.status}</Badge>
      <section className="overflow-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Teilnehmer</th>
              <th className="p-3">Bezahlt</th>
              <th className="p-3">Daten</th>
              <th className="p-3">Waiver</th>
              <th className="p-3">Material</th>
              <th className="p-3">Check-in</th>
            </tr>
          </thead>
          <tbody>
            {session.participants.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  {p.participant.firstName} {p.participant.lastName}
                  <div className="text-xs text-slate-500">Level {p.participant.surfLevel} {p.participant.notes ? `· ${p.participant.notes}` : ""}</div>
                </td>
                <td className="p-3">{p.booking.paymentStatus === "PAID" ? "ja" : "nein"}</td>
                <td className="p-3">{p.participant.wetsuitSize ? "vollständig" : "unvollständig"}</td>
                <td className="p-3">{p.participant.waivers.length ? "ja" : "nein"}</td>
                <td className="p-3">{p.resources.map((r) => r.resource.inventoryCode).join(", ") || "–"}</td>
                <td className="p-3">
                  <AttendanceToggle id={p.id} initial={p.attendance} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
