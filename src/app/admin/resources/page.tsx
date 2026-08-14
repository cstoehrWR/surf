import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/card";

export default async function ResourcesPage() {
  const resources = await prisma.resource.findMany({
    include: { resourceType: true, location: true },
    orderBy: { inventoryCode: "asc" },
  });
  return (
    <div>
      <h1 className="mb-4 text-3xl font-semibold">Ressourcen</h1>
      <div className="overflow-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Typ</th>
              <th className="p-3">Name</th>
              <th className="p-3">Standort</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-mono">{r.inventoryCode}</td>
                <td className="p-3">{r.resourceType.name}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.location.name}</td>
                <td className="p-3">
                  <Badge tone={r.status === "AVAILABLE" ? "teal" : "rose"}>{r.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
