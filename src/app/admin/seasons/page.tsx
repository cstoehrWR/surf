"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type Location = { id: string; name: string };
type Season = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  locationId: string | null;
  location: { name: string } | null;
};

export default function SeasonsAdminPage() {
  const [items, setItems] = useState<Season[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "Hauptsaison",
    locationId: "",
    startsOn: `${new Date().getFullYear()}-05-01`,
    endsOn: `${new Date().getFullYear()}-10-15`,
  });

  async function load() {
    const [s, l] = await Promise.all([fetch("/api/seasons"), fetch("/api/locations?admin=1")]);
    const sj = await s.json();
    const lj = await l.json();
    setItems(sj.data ?? []);
    setLocations(lj.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Saisons</h1>
      <p className="text-sm text-slate-600">
        Wenn Saisons angelegt sind, sind Buchungen nur innerhalb passender Zeiträume möglich (zusätzlich zu
        Produkt-Saisonfenstern).
      </p>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Neu anlegen</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Standort (optional)</Label>
            <Select
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
            >
              <option value="">Alle Standorte</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Von</Label>
            <Input
              type="date"
              value={form.startsOn}
              onChange={(e) => setForm({ ...form, startsOn: e.target.value })}
            />
          </div>
          <div>
            <Label>Bis</Label>
            <Input
              type="date"
              value={form.endsOn}
              onChange={(e) => setForm({ ...form, endsOn: e.target.value })}
            />
          </div>
        </div>
        <Button
          className="mt-3"
          onClick={async () => {
            setMsg(null);
            const res = await fetch("/api/seasons", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...form,
                locationId: form.locationId || null,
              }),
            });
            const json = await res.json();
            setMsg(res.ok ? "Gespeichert" : json.error ?? "Fehler");
            if (res.ok) load();
          }}
        >
          Speichern
        </Button>
        {msg ? <p className="mt-2 text-sm text-teal-800">{msg}</p> : null}
      </section>
      <div className="space-y-3">
        {items.map((s) => (
          <article key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm">
            <div>
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-slate-600">
                {new Date(s.startsOn).toLocaleDateString("de-DE")} –{" "}
                {new Date(s.endsOn).toLocaleDateString("de-DE")} ·{" "}
                {s.location?.name ?? "alle Standorte"}
              </p>
            </div>
            <button
              className="text-sm text-rose-700 underline"
              onClick={async () => {
                await fetch(`/api/seasons?id=${s.id}`, { method: "DELETE" });
                load();
              }}
            >
              Löschen
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
