"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";

type Location = { id: string; name: string };
type ResourceType = { id: string; name: string; key: string };
type Product = {
  id: string;
  name: string;
  type: string;
  sportType: string;
  bookingMode: string;
  basePrice: number;
  published: boolean;
  location: { name: string };
  durationMinutes: number;
  maxParticipants: number;
};

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [types, setTypes] = useState<ResourceType[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    locationId: "",
    type: "GROUP_COURSE",
    sportType: "SURF",
    bookingMode: "SESSION",
    basePrice: "69",
    durationMinutes: "120",
    maxParticipants: "8",
    startTimes: "10:00,14:00",
    requirementTypeIds: [] as string[],
  });

  async function load() {
    const [p, l, r] = await Promise.all([
      fetch("/api/products?admin=1"),
      fetch("/api/locations?admin=1"),
      fetch("/api/resources"),
    ]);
    const pj = await p.json();
    const lj = await l.json();
    const rj = await r.json();
    setProducts(pj.data ?? []);
    setLocations(lj.data ?? []);
    setTypes(rj.types ?? []);
    if (!form.locationId && lj.data?.[0]) setForm((f) => ({ ...f, locationId: lj.data[0].id }));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Produkte & Kurse</h1>
      </div>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Neu anlegen</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                  slug: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                })
              }
            />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
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
          <div className="md:col-span-3">
            <Label>Beschreibung</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Typ</Label>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="GROUP_COURSE">Gruppenkurs</option>
              <option value="PRIVATE_COURSE">Privat</option>
              <option value="RENTAL">Verleih</option>
              <option value="ADDON">Zusatz</option>
              <option value="ACCOMMODATION">Unterkunft</option>
              <option value="CAMPING">Camping</option>
            </Select>
          </div>
          <div>
            <Label>Sport</Label>
            <Select value={form.sportType} onChange={(e) => setForm({ ...form, sportType: e.target.value })}>
              <option value="SURF">Surf</option>
              <option value="KITE">Kite</option>
              <option value="SUP">SUP</option>
              <option value="WINDSURF">Windsurf</option>
              <option value="OTHER">Sonstiges</option>
            </Select>
          </div>
          <div>
            <Label>Buchungsmodus</Label>
            <Select value={form.bookingMode} onChange={(e) => setForm({ ...form, bookingMode: e.target.value })}>
              <option value="SESSION">Session/Kurs</option>
              <option value="NIGHTLY">Nacht (Unterkunft)</option>
            </Select>
          </div>
          <div>
            <Label>Preis (€)</Label>
            <Input value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
          </div>
          <div>
            <Label>Dauer (Min)</Label>
            <Input
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
            />
          </div>
          <div>
            <Label>Max. Teilnehmer</Label>
            <Input
              value={form.maxParticipants}
              onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
            />
          </div>
          <div>
            <Label>Startzeiten (kommagetrennt)</Label>
            <Input value={form.startTimes} onChange={(e) => setForm({ ...form, startTimes: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Label>Materialbedarf</Label>
            <div className="mt-1 flex flex-wrap gap-3 text-sm">
              {types.map((t) => (
                <label key={t.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.requirementTypeIds.includes(t.id)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        requirementTypeIds: e.target.checked
                          ? [...form.requirementTypeIds, t.id]
                          : form.requirementTypeIds.filter((id) => id !== t.id),
                      })
                    }
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <Button
          className="mt-3"
          onClick={async () => {
            setMsg(null);
            const res = await fetch("/api/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...form,
                basePrice: Number(form.basePrice),
                durationMinutes: Number(form.durationMinutes),
                maxParticipants: Number(form.maxParticipants),
                startTimes: form.startTimes.split(",").map((s) => s.trim()).filter(Boolean),
                category: form.type === "ACCOMMODATION" || form.type === "CAMPING" ? "Unterkunft" : "Kurse",
              }),
            });
            const json = await res.json();
            setMsg(res.ok ? `Angelegt: ${json.data.name}` : json.error ?? "Fehler");
            if (res.ok) load();
          }}
        >
          Speichern
        </Button>
        {msg && <p className="mt-2 text-sm text-teal-800">{msg}</p>}
      </section>
      <div className="grid gap-3">
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
            <div>
              <Link href={`/admin/products/${p.id}`} className="font-semibold hover:underline">
                {p.name}
              </Link>
              <p className="text-sm text-slate-600">
                {p.location.name} · {p.sportType} · {p.bookingMode} · {p.durationMinutes} Min · max {p.maxParticipants}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-semibold">{formatMoney(p.basePrice)}</p>
              <button
                className="text-sm text-slate-600 underline"
                onClick={async () => {
                  await fetch(`/api/products/${p.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ published: !p.published }),
                  });
                  load();
                }}
              >
                {p.published ? "Deaktivieren" : "Aktivieren"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
