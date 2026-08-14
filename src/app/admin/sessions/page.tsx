import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export default async function SessionsPage() {
  const session = await auth();
  const instructorFilter =
    session?.user.role === "INSTRUCTOR"
      ? { instructors: { some: { instructor: { userId: session.user.id } } } }
      : {};
  const sessions = await prisma.courseSession.findMany({
    where: { startsAt: { gte: new Date() }, ...instructorFilter },
    include: { product: true, location: true, instructors: { include: { instructor: true } }, participants: true },
    orderBy: { startsAt: "asc" },
    take: 50,
  });
  return (
    <div>
      <h1 className="mb-4 text-3xl font-semibold">Sessions</h1>
      <div className="space-y-2">
        {sessions.map((s) => (
          <Link key={s.id} href={`/admin/sessions/${s.id}`} className="block rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-semibold">
              {s.startsAt.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })} · {s.product.name}
            </p>
            <p className="text-sm text-slate-600">
              {s.participants.length}/{s.maxParticipants} · {s.instructors.map((i) => i.instructor.firstName).join(", ")} · {s.location.name} · {s.status}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
