"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type Unit = {
  id: string;
  name: string;
  code: string;
  capacity: number;
  active: boolean;
  product: { name: string };
  location: { name: string };
};
type Product = { id: string; name: string; locationId: string; bookingMode: string };
type Location = { id: string; name: string };

export default function LodgingUnitsPage() {
  const [items, setItems] = useState<Unit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    productId: "",
    locationId: "",
    name: "",
    code: "",
    capacity: "2",
  });

  async function load() {
    const [u, p, l] = await Promise.all([
      fetch("/api/lodging/units"),
      fetch("/api/products?admin=1&bookingMode=NIGHTLY"),
      fetch("/api/locations?admin=1"),
    ]);
    const uj = await u.json();
    const pj = await p.json();
    const lj = await l.json();
    setItems(uj.data ?? []);
    setProducts(pj.data ?? []);
    setLocations(lj.data ?? []);
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
      <h1 className="text-3xl font-semibold">Unterkunftseinheiten</h1>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Einheit anlegen</h2>
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
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <Label>Kapazität</Label>
            <Input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </div>
        </div>
        <Button
          className="mt-3"
          onClick={async () => {
            setMsg(null);
            const res = await fetch("/api/lodging/units", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...form, capacity: Number(form.capacity) }),
            });
            const json = await res.json();
            setMsg(res.ok ? `Angelegt: ${json.data.code}` : json.error ?? "Fehler");
            if (res.ok) load();
          }}
        >
          Speichern
        </Button>
        {msg && <p className="mt-2 text-sm text-teal-800">{msg}</p>}
      </section>
      <section className="overflow-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Name</th>
              <th className="p-3">Produkt</th>
              <th className="p-3">Kapazität</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-mono">{u.code}</td>
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.product.name}</td>
                <td className="p-3">{u.capacity}</td>
                <td className="p-3">
                  <button
                    className="underline"
                    onClick={async () => {
                      await fetch("/api/lodging/units", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: u.id, active: !u.active }),
                      });
                      load();
                    }}
                  >
                    {u.active ? "aktiv" : "inaktiv"}
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
