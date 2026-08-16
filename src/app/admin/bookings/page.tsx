import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { requireAdminOrg } from "@/lib/tenant/admin-scope";

export default async function BookingsPage() {
  const { where } = await requireAdminOrg();
  const bookings = await prisma.booking.findMany({
    where,
    include: { customer: true, items: { include: { session: true } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Buchungen</h1>
        <Link href="/admin/bookings/new" className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
          Manuell anlegen
        </Link>
      </div>
      <div className="overflow-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Nummer</th>
              <th className="p-3">Kunde</th>
              <th className="p-3">Status</th>
              <th className="p-3">Zahlung</th>
              <th className="p-3">Summe</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3">
                  <Link className="font-semibold text-teal-800" href={`/admin/bookings/${b.id}`}>
                    {b.number}
                  </Link>
                </td>
                <td className="p-3">
                  <Link className="underline" href={`/admin/customers/${b.customerId}`}>
                    {b.customer.firstName} {b.customer.lastName}
                  </Link>
                </td>
                <td className="p-3">
                  <Badge>{b.status}</Badge>
                </td>
                <td className="p-3">
                  <Badge tone={b.paymentStatus === "PAID" ? "teal" : "amber"}>{b.paymentStatus}</Badge>
                </td>
                <td className="p-3">{formatMoney(Number(b.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
