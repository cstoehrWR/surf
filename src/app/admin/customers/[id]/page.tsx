import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminOrg } from "@/lib/tenant/admin-scope";
import { formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/card";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { where } = await requireAdminOrg();
  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, ...where },
    include: {
      consents: { orderBy: { createdAt: "desc" } },
      bookings: {
        include: {
          items: { include: { product: true, session: true } },
          participants: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!customer) notFound();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-500">
          <Link href="/admin/customers" className="underline">
            Kunden
          </Link>
        </p>
        <h1 className="text-3xl font-semibold">
          {customer.firstName} {customer.lastName}
        </h1>
        <p className="text-sm text-slate-600">
          {customer.email}
          {customer.phone ? ` · ${customer.phone}` : ""} · Locale {customer.locale}
        </p>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Einwilligungen</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {customer.consents.map((c) => (
            <li key={c.id}>
              {c.type} · {c.accepted ? "ja" : "nein"} · {c.createdAt.toLocaleString("de-DE")}
            </li>
          ))}
          {customer.consents.length === 0 ? <li className="text-slate-500">Keine</li> : null}
        </ul>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Buchungen</h2>
        <div className="mt-3 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-2">Nummer</th>
                <th className="p-2">Status</th>
                <th className="p-2">Produkt</th>
                <th className="p-2">Summe</th>
              </tr>
            </thead>
            <tbody>
              {customer.bookings.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="p-2">
                    <Link className="font-semibold text-teal-800" href={`/admin/bookings/${b.id}`}>
                      {b.number}
                    </Link>
                  </td>
                  <td className="p-2">
                    <Badge>{b.status}</Badge>{" "}
                    <Badge tone={b.paymentStatus === "PAID" ? "teal" : "amber"}>{b.paymentStatus}</Badge>
                  </td>
                  <td className="p-2">
                    {b.items.map((i) => i.product.name).join(", ") || "–"}
                    {b.participants.length ? ` · ${b.participants.length} TN` : ""}
                  </td>
                  <td className="p-2">{formatMoney(Number(b.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {customer.bookings.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Noch keine Buchungen.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
