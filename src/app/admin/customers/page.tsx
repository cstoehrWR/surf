import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminOrg } from "@/lib/tenant/admin-scope";

export default async function CustomersPage() {
  const { where } = await requireAdminOrg();
  const customers = await prisma.customer.findMany({
    where,
    include: { _count: { select: { bookings: true } } },
    orderBy: { lastName: "asc" },
  });
  return (
    <div>
      <h1 className="mb-4 text-3xl font-semibold">Kunden</h1>
      <div className="overflow-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">E-Mail</th>
              <th className="p-3">Buchungen</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">
                  <Link className="font-semibold text-teal-800" href={`/admin/customers/${c.id}`}>
                    {c.firstName} {c.lastName}
                  </Link>
                </td>
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c._count.bookings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
