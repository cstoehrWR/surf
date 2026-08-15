import { SiteHeader } from "@/components/site-header";
import { BookingWizard } from "@/components/booking/booking-wizard";

export default function BookPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold text-teal-950">Kurs buchen</h1>
        <p className="mt-2 text-sm text-slate-600">
          North Sea Surf School – oder wähle eine Organisation unter <a className="underline" href="/">Start</a>.
        </p>
        <div className="mt-8">
          <BookingWizard orgSlug="north-sea-surf" />
        </div>
      </main>
    </div>
  );
}
