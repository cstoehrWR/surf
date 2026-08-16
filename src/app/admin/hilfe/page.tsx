import Link from "next/link";
import Image from "next/image";
import { handbookSections } from "@/lib/handbook/content";

export default function HandbookPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Online-Hilfe</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Online-Handbuch</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Kurzanleitung für das Backoffice. Nur digital – keine Druckversion. Abschnitte mit Screenshots der
          jeweiligen Masken. Screenshots bei Bedarf aktualisieren mit{" "}
          <code className="rounded bg-slate-100 px-1">npm run handbook:screenshots</code>.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="h-fit rounded-2xl bg-white p-4 shadow-sm lg:sticky lg:top-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Inhalt</p>
          <ul className="space-y-1 text-sm">
            {handbookSections.map((s) => (
              <li key={s.id}>
                <a className="block rounded-lg px-2 py-1.5 hover:bg-slate-50" href={`#${s.id}`}>
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
          {handbookSections.map((section) => (
            <article key={section.id} id={section.id} className="scroll-mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">{section.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{section.summary}</p>
                </div>
                {section.href ? (
                  <Link
                    href={section.href}
                    className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                  >
                    Zur Maske
                  </Link>
                ) : null}
              </div>

              {section.screenshot ? (
                <figure className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <Image
                    src={section.screenshot}
                    alt={`Screenshot: ${section.title}`}
                    width={1280}
                    height={720}
                    className="h-auto w-full object-cover object-top"
                    unoptimized
                  />
                  <figcaption className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                    Abbildung: {section.title}
                  </figcaption>
                </figure>
              ) : null}

              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              {section.tips?.length ? (
                <div className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
                  <p className="font-semibold">Tipp</p>
                  <ul className="mt-1 list-disc pl-5">
                    {section.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
