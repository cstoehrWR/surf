import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20">
        <section className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-800 via-cyan-800 to-sky-900 p-8 text-white md:p-14">
          <p className="text-sm uppercase tracking-[0.2em] text-teal-100">Nordstrand · Nordsee</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight md:text-6xl">
            Surfkurs in wenigen Minuten online buchen.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-teal-50/90">
            Gruppenkurse, Privatstunden, Kids und Verleih – Verfügbarkeit aus Kursplatz, Instructor und Material in Echtzeit.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/book" className="rounded-2xl bg-amber-200 px-6 py-3 font-semibold text-teal-950">
              Jetzt Kurs wählen
            </Link>
            <Link href="/login" className="rounded-2xl border border-white/30 px-6 py-3 font-semibold">
              Mitarbeiter-Login
            </Link>
          </div>
        </section>
        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["Live-Verfügbarkeit", "Keine Überbuchung: Boards, Neopren und Instructoren zählen mit."],
            ["Ohne Account", "Wie gewohnt verbindlich buchen, zahlen und Bestätigung erhalten."],
            ["Fürs Team", "Dashboard, Session Planner, Check-in und Rollenrechte inklusive."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-teal-900">{title}</h2>
              <p className="mt-2 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
