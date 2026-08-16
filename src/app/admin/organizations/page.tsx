"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Org = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  sports: string[];
};

export default function OrganizationsPage() {
  const [items, setItems] = useState<Org[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    tagline: "",
    sports: "SURF",
  });
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/organizations");
    const json = await res.json();
    setItems(json.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Organisationen</h1>
      <p className="text-sm text-slate-600">
        Multi-Tenant: jede Organisation hat eigene Produkte, Standorte und Buchungen. Öffentliche Seiten unter{" "}
        <code>/o/[slug]</code>.
      </p>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Neue Organisation (Super Admin)</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div>
            <Label>Tagline</Label>
            <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
          </div>
          <div>
            <Label>Sports (kommagetrennt)</Label>
            <Input value={form.sports} onChange={(e) => setForm({ ...form, sports: e.target.value })} />
          </div>
        </div>
        <Button
          className="mt-3"
          onClick={async () => {
            setMsg(null);
            const res = await fetch("/api/organizations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: form.name,
                slug: form.slug,
                tagline: form.tagline,
                sports: form.sports.split(",").map((s) => eTrim(s)),
              }),
            });
            const json = await res.json();
            setMsg(res.ok ? `Angelegt: /o/${json.data.slug}` : json.error ?? "Fehler");
            if (res.ok) load();
          }}
        >
          Anlegen
        </Button>
        {msg && <p className="mt-2 text-sm text-teal-800">{msg}</p>}
      </section>
      <section className="overflow-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Sports</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3">{o.name}</td>
                <td className="p-3 font-mono">{o.slug}</td>
                <td className="p-3">{o.sports?.join(", ")}</td>
                <td className="p-3 text-right">
                  <a className="text-teal-800 underline" href={`/o/${o.slug}`} target="_blank" rel="noreferrer">
                    Öffnen
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function eTrim(s: string) {
  return s.trim().toUpperCase();
}
