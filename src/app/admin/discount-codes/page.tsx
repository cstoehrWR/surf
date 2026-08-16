"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";

type Code = {
  id: string;
  code: string;
  percent: number | null;
  amount: number | null;
  active: boolean;
  validFrom: string | null;
  validTo: string | null;
};

export default function DiscountCodesPage() {
  const [items, setItems] = useState<Code[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "EARLY10",
    percent: "10",
    amount: "",
    validFrom: "",
    validTo: "",
  });

  async function load() {
    const res = await fetch("/api/discount-codes");
    const json = await res.json();
    setItems(json.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Rabattcodes</h1>
      <p className="text-sm text-slate-600">
        Prozent- oder Betragsrabatte für den Checkout. Gutscheine (Wert) bleiben unter „Gutscheine“.
      </p>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Neu anlegen</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <div>
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <Label>Prozent</Label>
            <Input
              type="number"
              value={form.percent}
              onChange={(e) => setForm({ ...form, percent: e.target.value, amount: "" })}
            />
          </div>
          <div>
            <Label>Betrag (€)</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value, percent: "" })}
            />
          </div>
          <div>
            <Label>Gültig von</Label>
            <Input
              type="date"
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
            />
          </div>
          <div>
            <Label>Gültig bis</Label>
            <Input
              type="date"
              value={form.validTo}
              onChange={(e) => setForm({ ...form, validTo: e.target.value })}
            />
          </div>
        </div>
        <Button
          className="mt-3"
          onClick={async () => {
            setMsg(null);
            const res = await fetch("/api/discount-codes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code: form.code,
                percent: form.percent ? Number(form.percent) : null,
                amount: form.amount ? Number(form.amount) : null,
                validFrom: form.validFrom || null,
                validTo: form.validTo || null,
              }),
            });
            const json = await res.json();
            setMsg(res.ok ? `Angelegt: ${json.data.code}` : json.error ?? "Fehler");
            if (res.ok) load();
          }}
        >
          Speichern
        </Button>
        {msg ? <p className="mt-2 text-sm text-teal-800">{msg}</p> : null}
      </section>
      <div className="space-y-2">
        {items.map((d) => (
          <article
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-semibold">{d.code}</p>
              <p className="text-sm text-slate-600">
                {d.percent != null ? `${d.percent} %` : formatMoney(d.amount ?? 0)} ·{" "}
                {d.active ? "aktiv" : "inaktiv"}
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <button
                className="underline"
                onClick={async () => {
                  await fetch("/api/discount-codes", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: d.id, active: !d.active }),
                  });
                  load();
                }}
              >
                {d.active ? "Deaktivieren" : "Aktivieren"}
              </button>
              <button
                className="text-rose-700 underline"
                onClick={async () => {
                  await fetch(`/api/discount-codes?id=${d.id}`, { method: "DELETE" });
                  load();
                }}
              >
                Löschen
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
