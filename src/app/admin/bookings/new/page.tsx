"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

export default function ManualBookingPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; locationId: string }>>([]);
  const [form, setForm] = useState({
    locationId: "",
    productId: "",
    date: new Date().toISOString().slice(0, 10),
    startTime: "10:00",
    firstName: "",
    lastName: "",
    email: "",
    participantFirst: "",
    participantLast: "",
    overrideReason: "",
    source: "phone",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/locations").then((r) => r.json()).then((d) => setLocations(d.data ?? []));
    fetch("/api/products").then((r) => r.json()).then((d) => setProducts(d.data ?? []));
  }, []);

  async function submit() {
    setError(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: form.productId,
        locationId: form.locationId,
        date: form.date,
        startTime: form.startTime,
        source: form.source,
        overrideReason: form.overrideReason || undefined,
        customer: { firstName: form.firstName, lastName: form.lastName, email: form.email },
        participants: [{ firstName: form.participantFirst, lastName: form.participantLast }],
        consents: { agb: true, privacy: true, participation: true },
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(`${json.error ?? "Fehler"} ${json.code ?? ""}`);
      return;
    }
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: json.data.id, method: "CASH" }),
    });
    router.push(`/admin/bookings/${json.data.id}`);
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-3xl font-semibold">Manuelle Buchung</h1>
      <p className="text-sm text-slate-600">Telefon / Walk-in / Partner. Es gelten dieselben Verfügbarkeitsregeln. Override nur mit Begründung (Audit).</p>
      <Label>Quelle</Label>
      <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
        <option value="phone">Telefon</option>
        <option value="walkin">Walk-in</option>
        <option value="partner">Hotelpartner</option>
      </Select>
      <Label>Standort</Label>
      <Select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
        <option value="">Bitte wählen</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </Select>
      <Label>Produkt</Label>
      <Select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
        <option value="">Bitte wählen</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>
      <Label>Datum</Label>
      <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      <Label>Uhrzeit</Label>
      <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
      <Label>Kunde</Label>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Vorname" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        <Input placeholder="Nachname" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
      </div>
      <Input placeholder="E-Mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Label>Teilnehmer</Label>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Vorname" value={form.participantFirst} onChange={(e) => setForm({ ...form, participantFirst: e.target.value })} />
        <Input placeholder="Nachname" value={form.participantLast} onChange={(e) => setForm({ ...form, participantLast: e.target.value })} />
      </div>
      <Label>Override-Begründung (optional)</Label>
      <Textarea value={form.overrideReason} onChange={(e) => setForm({ ...form, overrideReason: e.target.value })} />
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <Button onClick={submit}>Buchung anlegen</Button>
    </div>
  );
}
