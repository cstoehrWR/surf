"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  locationId: string;
  type: string;
};

export function LodgingWizard({ orgSlug }: { orgSlug: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [checkIn, setCheckIn] = useState(() => new Date().toISOString().slice(0, 10));
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [guests, setGuests] = useState(2);
  const [quote, setQuote] = useState<{ available: boolean; nights: number; lineTotal: number; freeUnits: number } | null>(
    null,
  );
  const [customer, setCustomer] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [consents, setConsents] = useState({ agb: false, privacy: false });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const product = products.find((p) => p.id === productId);

  useEffect(() => {
    fetch(`/api/products?org=${orgSlug}&bookingMode=NIGHTLY`)
      .then((r) => r.json())
      .then((j) => {
        setProducts(j.data ?? []);
        if (j.data?.[0]) setProductId(j.data[0].id);
      });
  }, [orgSlug]);

  useEffect(() => {
    if (!productId || !checkIn || !checkOut) return;
    fetch(
      `/api/lodging?productId=${productId}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`,
    )
      .then((r) => r.json())
      .then((j) => setQuote(j.data ?? null));
  }, [productId, checkIn, checkOut, guests]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => setProductId(p.id)}
            className={`rounded-2xl border bg-white p-4 text-left ${productId === p.id ? "border-teal-700" : "border-slate-200"}`}
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-slate-600">{p.description}</p>
              </div>
              <p className="font-semibold text-teal-800">{formatMoney(p.basePrice)}/Nacht</p>
            </div>
          </button>
        ))}
      </div>
      <div className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-3">
        <div>
          <Label>Anreise</Label>
          <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </div>
        <div>
          <Label>Abreise</Label>
          <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </div>
        <div>
          <Label>Gäste</Label>
          <Input type="number" min={1} max={12} value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
        </div>
      </div>
      {quote && (
        <p className="text-sm text-slate-700">
          {quote.available
            ? `${quote.nights} Nächte · ${quote.freeUnits} Einheiten frei · ${formatMoney(quote.lineTotal)}`
            : "Keine Einheit verfügbar"}
        </p>
      )}
      <div className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-2">
        <div>
          <Label>Vorname</Label>
          <Input value={customer.firstName} onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} />
        </div>
        <div>
          <Label>Nachname</Label>
          <Input value={customer.lastName} onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} />
        </div>
        <div>
          <Label>E-Mail</Label>
          <Input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
        </div>
        <div>
          <Label>Telefon</Label>
          <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={consents.agb} onChange={(e) => setConsents({ ...consents, agb: e.target.checked })} />
          AGB
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={consents.privacy}
            onChange={(e) => setConsents({ ...consents, privacy: e.target.checked })}
          />
          Datenschutz
        </label>
      </div>
      <Button
        disabled={busy || !quote?.available || !consents.agb || !consents.privacy || !product}
        onClick={async () => {
          if (!product) return;
          setBusy(true);
          setMsg(null);
          const res = await fetch("/api/lodging", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: product.id,
              locationId: product.locationId,
              checkIn,
              checkOut,
              guests,
              customer,
              guestsDetail: [{ firstName: customer.firstName, lastName: customer.lastName }],
              consents: { ...consents, participation: true },
            }),
          });
          const json = await res.json();
          setBusy(false);
          if (!res.ok) {
            setMsg(json.error ?? "Fehler");
            return;
          }
          const pay = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: json.data.id, method: "STRIPE" }),
          });
          const payJson = await pay.json();
          window.location.href = payJson.data?.redirectUrl ?? `/book/confirmation/${json.data.number}`;
        }}
      >
        Verbindlich buchen
      </Button>
      {msg && <p className="text-sm text-rose-700">{msg}</p>}
    </div>
  );
}
