import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/card";

export default async function WaiversAdminPage() {
  const templates = await prisma.waiverTemplate.findMany({
    include: {
      products: { include: { product: true } },
      _count: { select: { signatures: true } },
    },
    orderBy: [{ name: "asc" }, { version: "desc" }],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Waiver-Vorlagen</h1>
      <p className="text-sm text-slate-600">
        Unterschriebene Erklärungen sind unveränderlich. Neue Versionen gelten nur für künftige Unterschriften.
      </p>
      <div className="space-y-3">
        {templates.map((t) => (
          <article key={t.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {t.name} <span className="text-slate-500">v{t.version}</span>
              </h2>
              <Badge tone={t.active ? "teal" : "slate"}>{t.active ? "aktiv" : "inaktiv"}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{t.body}</p>
            <p className="mt-3 text-sm">
              Produkte: {t.products.map((p) => p.product.name).join(", ") || "–"}
            </p>
            <p className="text-sm">Unterschriften: {t._count.signatures}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
