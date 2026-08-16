"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type Session = {
  id: string;
  startsAt: string;
  status: string;
  maxParticipants: number;
  booked: number;
  product: { name: string };
  location: { name: string };
  instructors: Array<{ instructor: { firstName: string } }>;
};
type Product = { id: string; name: string; locationId: string };
type Location = { id: string; name: string };
type Instructor = { id: string; firstName: string; lastName: string };

export default function SessionsAdminPage() {
  const [items, setItems] = useState<Session[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    productId: "",
    locationId: "",
    startsAt: "",
    maxParticipants: "",
    instructorId: "",
  });

  async function load() {
    const from = new Date().toISOString();
    const [s, p, l, i] = await Promise.all([
      fetch(`/api/sessions?from=${from}`),
      fetch("/api/products?admin=1&bookingMode=SESSION"),
      fetch("/api/locations?admin=1"),
      fetch("/api/instructors"),
    ]);
    const sj = await s.json();
    const pj = await p.json();
    const lj = await l.json();
    const ij = await i.json();
    setItems(sj.data ?? []);
    setProducts(pj.data ?? []);
    setLocations(lj.data ?? []);
    setInstructors(ij.data ?? []);
    if (!form.productId && pj.data?.[0]) {
      setForm((f) => ({
        ...f,
        productId: pj.data[0].id,
        locationId: pj.data[0].locationId,
      }));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Sessions</h1>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Session anlegen</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <Label>Produkt</Label>
            <Select
              value={form.productId}
              onChange={(e) => {
                const p = products.find((x) => x.id === e.target.value);
                setForm({ ...form, productId: e.target.value, locationId: p?.locationId ?? form.locationId });
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Standort</Label>
            <Select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Start</Label>
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
          </div>
          <div>
            <Label>Max. Teilnehmer (optional)</Label>
            <Input
              value={form.maxParticipants}
              onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
            />
          </div>
          <div>
            <Label>Instructor</Label>
            <Select value={form.instructorId} onChange={(e) => setForm({ ...form, instructorId: e.target.value })}>
              <option value="">–</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.firstName} {i.lastName}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <Button
          className="mt-3"
          onClick={async () => {
            setMsg(null);
            const res = await fetch("/api/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: form.productId,
                locationId: form.locationId,
                startsAt: new Date(form.startsAt).toISOString(),
                maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
                instructorIds: form.instructorId ? [form.instructorId] : [],
              }),
            });
            const json = await res.json();
            setMsg(res.ok ? "Session angelegt" : json.error ?? "Fehler");
            if (res.ok) load();
          }}
        >
          Speichern
        </Button>
        {msg && <p className="mt-2 text-sm text-teal-800">{msg}</p>}
      </section>
      <div className="space-y-2">
        {items.map((s) => (
          <Link key={s.id} href={`/admin/sessions/${s.id}`} className="block rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-semibold">
              {new Date(s.startsAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
              {s.product.name}
            </p>
            <p className="text-sm text-slate-600">
              {s.booked}/{s.maxParticipants} · {s.instructors.map((i) => i.instructor.firstName).join(", ")} ·{" "}
              {s.location.name} · {s.status}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
