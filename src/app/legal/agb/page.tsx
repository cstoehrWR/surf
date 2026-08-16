import { SiteHeader } from "@/components/site-header";

export default function AgbPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Allgemeine Geschäftsbedingungen</h1>
        <p className="mt-4 text-slate-700">
          Mit der Buchung kommt ein Vertrag mit der North Sea Surf School zustande. Es gelten die zum Buchungszeitpunkt
          angezeigten Preise. Stornierungen richten sich nach der am Produkt hinterlegten Frist. Die Demo-Instanz dient
          der Software-Erprobung.
        </p>
      </main>
    </div>
  );
}
