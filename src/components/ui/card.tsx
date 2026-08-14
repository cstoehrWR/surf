import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur", className)}>{children}</div>;
}

export function Badge({ children, tone = "teal" }: { children: React.ReactNode; tone?: "teal" | "amber" | "rose" | "slate" }) {
  const map = {
    teal: "bg-teal-50 text-teal-800",
    amber: "bg-amber-50 text-amber-800",
    rose: "bg-rose-50 text-rose-800",
    slate: "bg-slate-100 text-slate-700",
  };
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", map[tone])}>{children}</span>;
}
