"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";

type Location = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  description: string;
  type: string;
  basePrice: number;
  durationMinutes: number;
  locationId: string;
  variants: Array<{ id: string; name: string; price: number }>;
};
type Slot = {
  startTime: string;
  available: boolean;
  availableSlots: number;
  price: number;
  reasons: string[];
  missingResources: Array<{ resourceTypeName: string; required: number; available: number }>;
};

const STEPS = [
  "Standort",
  "Kurs",
  "Datum",
  "Uhrzeit",
  "Anzahl",
  "Teilnehmer",
  "Zusatz",
  "AGB",
  "Zahlung",
];

type Person = {
  firstName: string;
  lastName: string;
  age?: string;
  surfLevel: string;
  wetsuitSize?: string;
  canSwim: boolean;
  notes?: string;
};

export function BookingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [addons, setAddons] = useState<Product[]>([]);
  const [locationId, setLocationId] = useState("");
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [count, setCount] = useState(1);
  const [people, setPeople] = useState<Person[]>([emptyPerson()]);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [customer, setCustomer] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [consents, setConsents] = useState({ agb: false, privacy: false, participation: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const product = products.find((p) => p.id === productId);
  const selectedSlot = slots.find((s) => s.startTime === startTime);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => {
        setLocations(d.data ?? []);
        if (d.data?.[0]) setLocationId(d.data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!locationId) return;
    fetch(`/api/products?locationId=${locationId}`)
      .then((r) => r.json())
      .then((d) => {
        const list = (d.data ?? []) as Product[];
        setProducts(list.filter((p) => p.type !== "ADDON"));
        setAddons(list.filter((p) => p.type === "ADDON"));
      });
  }, [locationId]);

  useEffect(() => {
    if (!productId || !locationId || !date) return;
    fetch(`/api/availability?productId=${productId}&locationId=${locationId}&date=${date}&participants=${count}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.data?.slots ?? []));
  }, [productId, locationId, date, count]);

  useEffect(() => {
    setPeople((prev) => {
      const next = [...prev];
      while (next.length < count) next.push(emptyPerson());
      return next.slice(0, count);
    });
  }, [count]);

  const estimate = useMemo(() => {
    const unit = product?.variants.find((v) => v.id === variantId)?.price ?? product?.basePrice ?? 0;
    const add = addons.filter((a) => addonIds.includes(a.id)).reduce((s, a) => s + a.basePrice * count, 0);
    return unit * count + add;
  }, [product, variantId, count, addonIds, addons]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const created = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          variantId: variantId || undefined,
          locationId,
          date,
          startTime,
          participants: people.map((p) => ({
            ...p,
            age: p.age ? Number(p.age) : undefined,
            canSwim: p.canSwim,
          })),
          addOnProductIds: addonIds,
          customer,
          consents: { agb: true, privacy: true, participation: true },
        }),
      });
      const json = await created.json();
      if (!created.ok) {
        setError(json.error ?? "Buchung nicht möglich");
        setBusy(false);
        return;
      }
      const pay = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: json.data.id, method: "STRIPE" }),
      });
      const payJson = await pay.json();
      if (payJson.data?.redirectUrl) {
        router.push(payJson.data.redirectUrl);
        return;
      }
      router.push(`/book/confirmation/${json.data.number}`);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setBusy(false);
    }
  }

  const canNext = [
    Boolean(locationId),
    Boolean(productId),
    Boolean(date),
    Boolean(startTime && selectedSlot?.available),
    count >= 1,
    people.every((p) => p.firstName && p.lastName),
    true,
    consents.agb && consents.privacy && consents.participation && customer.email && customer.firstName,
    true,
  ][step];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => i <= step && setStep(i)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
              i === step ? "bg-teal-700 text-white" : i < step ? "bg-teal-100 text-teal-900" : "bg-white text-slate-400"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <Card>
          <h2 className="text-lg font-semibold">Standort wählen</h2>
          <div className="mt-4 grid gap-3">
            {locations.map((l) => (
              <button
                key={l.id}
                onClick={() => setLocationId(l.id)}
                className={`rounded-2xl border p-4 text-left ${locationId === l.id ? "border-teal-700 bg-teal-50" : "border-slate-200"}`}
              >
                {l.name}
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === 1 && (
        <div className="grid gap-3">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setProductId(p.id);
                setVariantId(p.variants[0]?.id ?? "");
              }}
              className={`rounded-2xl border bg-white p-4 text-left ${productId === p.id ? "border-teal-700" : "border-slate-200"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-slate-600">{p.description}</p>
                </div>
                <p className="font-semibold text-teal-800">{formatMoney(p.basePrice)}</p>
              </div>
            </button>
          ))}
          {product && product.variants.length > 1 && (
            <div>
              <Label>Variante</Label>
              <Select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} – {formatMoney(v.price)}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <Card>
          <Label>Datum</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Card>
      )}

      {step === 3 && (
        <div className="grid gap-3">
          {slots.map((slot) => (
            <button
              key={slot.startTime}
              disabled={!slot.available}
              onClick={() => setStartTime(slot.startTime)}
              className={`rounded-2xl border bg-white p-4 text-left disabled:opacity-50 ${
                startTime === slot.startTime ? "border-teal-700" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{slot.startTime} Uhr</span>
                <span className="text-sm">
                  {slot.availableSlots} Plätze · {formatMoney(slot.price)}
                </span>
              </div>
              {slot.missingResources.length > 0 && (
                <p className="mt-1 text-xs text-rose-700">
                  Engpass: {slot.missingResources.map((m) => `${m.resourceTypeName} ${m.available}/${m.required}`).join(", ")}
                </p>
              )}
            </button>
          ))}
          {slots.length === 0 && <p className="text-sm text-slate-500">Keine Zeiten geladen.</p>}
        </div>
      )}

      {step === 4 && (
        <Card>
          <Label>Teilnehmerzahl</Label>
          <Input type="number" min={1} max={selectedSlot?.availableSlots ?? 8} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          <p className="mt-2 text-sm text-slate-600">Maximal {selectedSlot?.availableSlots ?? "–"} Plätze in diesem Slot.</p>
        </Card>
      )}

      {step === 5 && (
        <div className="space-y-4">
          {people.map((person, idx) => (
            <Card key={idx}>
              <p className="font-semibold">Teilnehmer {idx + 1}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Vorname</Label>
                  <Input value={person.firstName} onChange={(e) => updatePerson(idx, { firstName: e.target.value })} />
                </div>
                <div>
                  <Label>Nachname</Label>
                  <Input value={person.lastName} onChange={(e) => updatePerson(idx, { lastName: e.target.value })} />
                </div>
                <div>
                  <Label>Alter</Label>
                  <Input value={person.age ?? ""} onChange={(e) => updatePerson(idx, { age: e.target.value })} />
                </div>
                <div>
                  <Label>Surflevel</Label>
                  <Select value={person.surfLevel} onChange={(e) => updatePerson(idx, { surfLevel: e.target.value })}>
                    <option value="NONE">Kein</option>
                    <option value="BEGINNER">Anfänger</option>
                    <option value="INTERMEDIATE">Fortgeschritten</option>
                    <option value="ADVANCED">Advanced</option>
                  </Select>
                </div>
                <div>
                  <Label>Neoprengröße</Label>
                  <Input value={person.wetsuitSize ?? ""} onChange={(e) => updatePerson(idx, { wetsuitSize: e.target.value })} />
                </div>
                <label className="mt-6 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={person.canSwim}
                    onChange={(e) => updatePerson(idx, { canSwim: e.target.checked })}
                  />
                  Schwimmfähig
                </label>
                <div className="md:col-span-2">
                  <Label>Hinweise</Label>
                  <Textarea value={person.notes ?? ""} onChange={(e) => updatePerson(idx, { notes: e.target.value })} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {step === 6 && (
        <div className="grid gap-3">
          {addons.map((a) => (
            <label key={a.id} className="flex items-center justify-between rounded-2xl border bg-white p-4">
              <span>
                <span className="font-semibold">{a.name}</span>
                <span className="ml-2 text-sm text-slate-500">{formatMoney(a.basePrice)} / Person</span>
              </span>
              <input
                type="checkbox"
                checked={addonIds.includes(a.id)}
                onChange={(e) =>
                  setAddonIds((ids) => (e.target.checked ? [...ids, a.id] : ids.filter((id) => id !== a.id)))
                }
              />
            </label>
          ))}
          {addons.length === 0 && <p className="text-sm text-slate-500">Keine Zusatzleistungen.</p>}
        </div>
      )}

      {step === 7 && (
        <Card className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Vorname Buchender</Label>
              <Input value={customer.firstName} onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} />
            </div>
            <div>
              <Label>Nachname</Label>
              <Input value={customer.lastName} onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} />
            </div>
            <div>
              <Label>E-Mail</Label>
              <Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            </div>
          </div>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" checked={consents.agb} onChange={(e) => setConsents({ ...consents, agb: e.target.checked })} />
            Ich habe die <a className="underline" href="/legal/agb">AGB</a> gelesen und erkenne sie an.
          </label>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" checked={consents.privacy} onChange={(e) => setConsents({ ...consents, privacy: e.target.checked })} />
            Ich willige in die Verarbeitung gemäß <a className="underline" href="/legal/datenschutz">Datenschutz</a> ein.
          </label>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" checked={consents.participation} onChange={(e) => setConsents({ ...consents, participation: e.target.checked })} />
            Ich akzeptiere die Teilnahmebedingungen.
          </label>
          <p className="text-lg font-semibold">Gesamt {formatMoney(estimate)}</p>
        </Card>
      )}

      {step === 8 && (
        <Card>
          <p className="text-lg font-semibold">Zahlung</p>
          <p className="mt-2 text-sm text-slate-600">
            Kartendaten werden ausschließlich über Stripe verarbeitet. Ohne Stripe-Keys bestätigt die Demo-Zahlung die Buchung direkt.
          </p>
          <p className="mt-4 text-2xl font-bold">{formatMoney(estimate)}</p>
          {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
          <Button className="mt-4 w-full" disabled={busy} onClick={submit}>
            {busy ? "Bitte warten…" : "Verbindlich buchen und zahlen"}
          </Button>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Zurück
        </Button>
        {step < 8 && (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Weiter
          </Button>
        )}
      </div>
    </div>
  );

  function updatePerson(idx: number, patch: Partial<Person>) {
    setPeople((all) => all.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }
}

function emptyPerson(): Person {
  return { firstName: "", lastName: "", surfLevel: "BEGINNER", canSwim: true };
}
