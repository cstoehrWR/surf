import { prisma } from "@/lib/db";

export default async function InstructorsPage() {
  const instructors = await prisma.instructor.findMany({
    include: { locations: { include: { location: true } }, productTypes: true, absences: true },
    orderBy: { firstName: "asc" },
  });
  return (
    <div>
      <h1 className="mb-4 text-3xl font-semibold">Surflehrer</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {instructors.map((i) => (
          <article key={i.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">
              {i.firstName} {i.lastName}
            </h2>
            <p className="text-sm text-slate-600">{i.email}</p>
            <p className="mt-2 text-sm">Qualifikationen: {i.qualifications.join(", ")}</p>
            <p className="text-sm">Level {i.level} · max {i.maxWeeklyHours}h</p>
            <p className="text-sm">Standorte: {i.locations.map((l) => l.location.name).join(", ")}</p>
            <p className="text-sm">Kurse: {i.productTypes.map((p) => p.productType).join(", ")}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
