"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";

type Rule = {
  id: string;
  name: string;
  type: string;
  priority: number;
  amount: number | null;
  percent: number | null;
  minParticipants: number | null;
  maxParticipants: number | null;
  weekday: number | null;
  active: boolean;
  product: { id: string; name: string } | null;
};

type Product = { id: string; name: string };

export default function PricingPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "Wochenende",
    type: "WEEKEND",
    priority: "10",
    amount: "79",
    percent: "",
    minParticipants: "",
    maxParticipants: "",
    productId: "",
  });

  async function load() {
    const [r, p] = await Promise.all([fetch("/api/pricing/rules"), fetch("/api/products")]);
    const rj = await r.json();
    const pj = await p.json();
    setRules(rj.data ?? []);
    setProducts((pj.data ?? []).filter((x: Product & { type?: string }) => x.type !== "ADDON"));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Preisregeln</h1>
      <p className="text-sm text-slate-600">
        Advanced Pricing: Wochenende, Saison, Gruppe, Frühbucher, Last Minute. Regeln werden nach Priorität
        angewandt und im Booking als Snapshot gespeichert.
      </p>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Neue Regel</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Typ</Label>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="WEEKEND">Wochenende</option>
              <option value="SEASON">Saison</option>
              <option value="GROUP">Gruppe</option>
              <option value="DISCOUNT">Rabatt</option>
              <option value="EARLY_BIRD">Frühbucher</option>
              <option value="LAST_MINUTE">Last Minute</option>
            </Select>
          </div>
          <div>
            <Label>Produkt (optional)</Label>
            <Select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
              <option value="">Alle Produkte</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Priorität</Label>
            <Input value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
          </div>
          <div>
            <Label>Betrag (€)</Label>
            <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <Label>Prozent</Label>
            <Input value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} />
          </div>
          <div>
            <Label>Min TN / Tage (Frühbucher)</Label>
            <Input
              value={form.minParticipants}
              onChange={(e) => setForm({ ...form, minParticipants: e.target.value })}
            />
          </div>
          <div>
            <Label>Max TN / Tage (Last Minute)</Label>
            <Input
              value={form.maxParticipants}
              onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={async () => {
                setMsg(null);
                const res = await fetch("/api/pricing/rules", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: form.name,
                    type: form.type,
                    priority: Number(form.priority),
                    amount: form.amount ? Number(form.amount) : null,
                    percent: form.percent ? Number(form.percent) : null,
                    minParticipants: form.minParticipants ? Number(form.minParticipants) : null,
                    maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
                    productId: form.productId || null,
                  }),
                });
                const json = await res.json();
                if (!res.ok) {
                  setMsg(json.error ?? "Fehler");
                  return;
                }
                setMsg(`Gespeichert: ${json.data.name}`);
                load();
              }}
            >
              Speichern
            </Button>
          </div>
        </div>
        {msg && <p className="mt-2 text-sm text-teal-800">{msg}</p>}
      </section>
      <section className="overflow-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Typ</th>
              <th className="p-3">Produkt</th>
              <th className="p-3">Wert</th>
              <th className="p-3">Prio</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.type}</td>
                <td className="p-3">{r.product?.name ?? "alle"}</td>
                <td className="p-3">
                  {r.amount != null ? formatMoney(r.amount) : r.percent != null ? `${r.percent} %` : "–"}
                </td>
                <td className="p-3">{r.priority}</td>
                <td className="p-3 text-right">
                  <button
                    className="text-rose-700 underline"
                    onClick={async () => {
                      await fetch(`/api/pricing/rules?id=${r.id}`, { method: "DELETE" });
                      load();
                    }}
                  >
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
