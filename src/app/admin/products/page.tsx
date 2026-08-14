import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/card";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({ include: { variants: true, location: true }, orderBy: { name: "asc" } });
  return (
    <div>
      <h1 className="mb-4 text-3xl font-semibold">Produkte</h1>
      <div className="grid gap-3">
        {products.map((p) => (
          <Link key={p.id} href={`/admin/products/${p.id}`} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-slate-600">{p.location.name} · {p.durationMinutes} Min · max {p.maxParticipants}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatMoney(Number(p.basePrice))}</p>
                <Badge tone={p.published ? "teal" : "slate"}>{p.published ? "aktiv" : "inaktiv"}</Badge>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
