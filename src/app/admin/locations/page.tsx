"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type Location = { id: string; name: string; slug: string; address: string | null; active: boolean };

export default function LocationsAdminPage() {
  const [items, setItems] = useState<Location[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", address: "" });

  async function load() {
    const res = await fetch("/api/locations?admin=1");
    const json = await res.json();
    setItems(json.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Standorte</h1>
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
            <Label>Adresse</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>
        <Button
          className="mt-3"
          onClick={async () => {
            setMsg(null);
            const res = await fetch("/api/locations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
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
        {items.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
            <div>
              <p className="font-semibold">{l.name}</p>
              <p className="text-sm text-slate-600">
                {l.slug} · {l.address}
              </p>
            </div>
            <button
              className="text-sm underline"
              onClick={async () => {
                await fetch("/api/locations", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: l.id, active: !l.active }),
                });
                load();
              }}
            >
              {l.active ? "Deaktivieren" : "Aktivieren"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
