import { SiteHeader } from "@/components/site-header";

export default function PrivacyPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Datenschutzerklärung</h1>
        <p className="mt-4 text-slate-700">
          Wir verarbeiten Buchungsdaten zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO). Gesundheitsdaten werden nicht
          erhoben. Zahlungsdaten verarbeitet ausschließlich Stripe. Sie haben Rechte auf Auskunft, Berichtigung, Löschung
          und Datenübertragbarkeit.
        </p>
      </main>
    </div>
  );
}
