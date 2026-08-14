import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

const links = [
  ["/admin", "Dashboard"],
  ["/admin/planner", "Planner"],
  ["/admin/calendar", "Kalender"],
  ["/admin/bookings", "Buchungen"],
  ["/admin/bookings/new", "Manuelle Buchung"],
  ["/admin/sessions", "Sessions"],
  ["/admin/products", "Produkte"],
  ["/admin/instructors", "Surflehrer"],
  ["/admin/resources", "Ressourcen"],
  ["/admin/customers", "Kunden"],
  ["/admin/waivers", "Waiver"],
  ["/admin/reports", "Reports"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  const role = session.user.role;
  if (role === "CUSTOMER") redirect("/");

  return (
    <div className="min-h-screen bg-slate-100 md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-slate-200 bg-teal-950 p-4 text-teal-50 md:min-h-screen md:border-b-0">
        <p className="text-xs uppercase tracking-widest text-teal-300">Backoffice</p>
        <p className="mt-1 font-semibold">North Sea Surf</p>
        <p className="text-xs text-teal-200">
          {session.user.name} · {role}
        </p>
        <nav className="mt-6 grid gap-1 text-sm">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-2 hover:bg-teal-800">
              {label}
            </Link>
          ))}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
          className="mt-6"
        >
          <button className="text-sm text-teal-200 underline">Abmelden</button>
        </form>
      </aside>
      <div className="p-4 md:p-8">{children}</div>
    </div>
  );
}
