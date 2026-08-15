"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type Instructor = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  level: string;
  maxWeeklyHours: number;
  active: boolean;
  qualifications: string[];
  locations: Array<{ location: { name: string } }>;
  productTypes: Array<{ productType: string }>;
};
type Location = { id: string; name: string };

export default function InstructorsAdminPage() {
  const [items, setItems] = useState<Instructor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    level: "INTERMEDIATE",
    maxWeeklyHours: "40",
    qualifications: "ISA Level 1",
    locationIds: [] as string[],
    productTypes: ["GROUP_COURSE"],
  });

  async function load() {
    const [i, l] = await Promise.all([fetch("/api/instructors"), fetch("/api/locations?admin=1")]);
    const ij = await i.json();
    const lj = await l.json();
    setItems(ij.data ?? []);
    setLocations(lj.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Surflehrer / Guides</h1>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Neu anlegen</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <Label>Vorname</Label>
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <Label>Nachname</Label>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div>
            <Label>E-Mail</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Level</Label>
            <Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              <option value="BEGINNER">BEGINNER</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="ADVANCED">ADVANCED</option>
              <option value="PRO">PRO</option>
            </Select>
          </div>
          <div>
            <Label>Max. Wochenstunden</Label>
            <Input
              value={form.maxWeeklyHours}
              onChange={(e) => setForm({ ...form, maxWeeklyHours: e.target.value })}
            />
          </div>
          <div>
            <Label>Qualifikationen</Label>
            <Input
              value={form.qualifications}
              onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
            />
          </div>
          <div className="md:col-span-3">
            <Label>Standorte</Label>
            <div className="mt-1 flex flex-wrap gap-3 text-sm">
              {locations.map((l) => (
                <label key={l.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.locationIds.includes(l.id)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        locationIds: e.target.checked
                          ? [...form.locationIds, l.id]
                          : form.locationIds.filter((id) => id !== l.id),
                      })
                    }
                  />
                  {l.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <Button
          className="mt-3"
          onClick={async () => {
            setMsg(null);
            const res = await fetch("/api/instructors", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...form,
                maxWeeklyHours: Number(form.maxWeeklyHours),
                qualifications: form.qualifications.split(",").map((s) => s.trim()).filter(Boolean),
              }),
            });
            const json = await res.json();
            setMsg(res.ok ? `Angelegt: ${json.data.firstName}` : json.error ?? "Fehler");
            if (res.ok) load();
          }}
        >
          Speichern
        </Button>
        {msg && <p className="mt-2 text-sm text-teal-800">{msg}</p>}
      </section>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((i) => (
          <article key={i.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">
              {i.firstName} {i.lastName}
            </h2>
            <p className="text-sm text-slate-600">{i.email}</p>
            <p className="mt-2 text-sm">Qualifikationen: {i.qualifications.join(", ")}</p>
            <p className="text-sm">
              Level {i.level} · max {i.maxWeeklyHours}h · {i.active ? "aktiv" : "inaktiv"}
            </p>
            <p className="text-sm">Standorte: {i.locations.map((l) => l.location.name).join(", ")}</p>
            <button
              className="mt-2 text-sm text-teal-800 underline"
              onClick={async () => {
                await fetch("/api/instructors", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: i.id, active: !i.active }),
                });
                load();
              }}
            >
              {i.active ? "Deaktivieren" : "Aktivieren"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
