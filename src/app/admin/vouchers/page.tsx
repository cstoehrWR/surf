"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";

type Voucher = {
  id: string;
  code: string;
  type: string;
  originalValue: number;
  remainingValue: number;
  status: string;
};

export default function VouchersPage() {
  const [items, setItems] = useState<Voucher[]>([]);
  const [code, setCode] = useState("WAVE50");
  const [type, setType] = useState("VALUE");
  const [value, setValue] = useState("50");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/vouchers");
    const json = await res.json();
    setItems(json.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Gutscheine</h1>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Neu anlegen</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div>
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <Label>Typ</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="VALUE">Wertgutschein</option>
              <option value="PRODUCT">Produktgutschein</option>
              <option value="DISCOUNT">Rabattgutschein</option>
            </Select>
          </div>
          <div>
            <Label>Wert (€)</Label>
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button
              onClick={async () => {
                setMsg(null);
                const res = await fetch("/api/vouchers", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code, type, value: Number(value) }),
                });
                const json = await res.json();
                if (!res.ok) {
                  setMsg(json.error ?? "Fehler");
                  return;
                }
                setMsg(`Angelegt: ${json.data.code}`);
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
              <th className="p-3">Code</th>
              <th className="p-3">Typ</th>
              <th className="p-3">Wert</th>
              <th className="p-3">Rest</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="p-3 font-mono">{v.code}</td>
                <td className="p-3">{v.type}</td>
                <td className="p-3">{formatMoney(v.originalValue)}</td>
                <td className="p-3">{formatMoney(v.remainingValue)}</td>
                <td className="p-3">{v.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
