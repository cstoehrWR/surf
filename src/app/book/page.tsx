import { SiteHeader } from "@/components/site-header";
import { BookingWizard } from "@/components/booking/booking-wizard";

export default function BookPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <h1 className="mb-6 text-3xl font-semibold text-teal-950">Kurs buchen</h1>
        <BookingWizard />
      </main>
    </div>
  );
}
