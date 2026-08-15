"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type Resource = {
  id: string;
  inventoryCode: string;
  name: string;
  status: string;
  resourceType: { name: string };
  location: { name: string };
};
type Type = { id: string; name: string; key: string };
type Location = { id: string; name: string };

export default function ResourcesAdminPage() {
  const [items, setItems] = useState<Resource[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    locationId: "",
    resourceTypeId: "",
    newTypeKey: "",
    newTypeName: "",
    inventoryCode: "",
    name: "",
    status: "AVAILABLE",
  });

  async function load() {
    const [r, l] = await Promise.all([fetch("/api/resources"), fetch("/api/locations?admin=1")]);
    const rj = await r.json();
    const lj = await l.json();
    setItems(rj.data ?? []);
    setTypes(rj.types ?? []);
    setLocations(lj.data ?? []);
    if (!form.locationId && lj.data?.[0]) setForm((f) => ({ ...f, locationId: lj.data[0].id }));
    if (!form.resourceTypeId && rj.types?.[0]) setForm((f) => ({ ...f, resourceTypeId: rj.types[0].id }));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Ressourcen / Material</h1>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Material anlegen</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
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
            <Label>Typ</Label>
            <Select
              value={form.resourceTypeId}
              onChange={(e) => setForm({ ...form, resourceTypeId: e.target.value, newTypeKey: "", newTypeName: "" })}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              <option value="">+ Neuer Typ…</option>
            </Select>
          </div>
          {!form.resourceTypeId && (
            <>
              <div>
                <Label>Neuer Typ Key</Label>
                <Input
                  placeholder="helmet"
                  value={form.newTypeKey}
                  onChange={(e) => setForm({ ...form, newTypeKey: e.target.value })}
                />
              </div>
              <div>
                <Label>Neuer Typ Name</Label>
                <Input
                  placeholder="Helm"
                  value={form.newTypeName}
                  onChange={(e) => setForm({ ...form, newTypeName: e.target.value })}
                />
              </div>
            </>
          )}
          <div>
            <Label>Inventarcode</Label>
            <Input value={form.inventoryCode} onChange={(e) => setForm({ ...form, inventoryCode: e.target.value })} />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="DEFECT">DEFECT</option>
            </Select>
          </div>
        </div>
        <Button
          className="mt-3"
          onClick={async () => {
            setMsg(null);
            const res = await fetch("/api/resources", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });
            const json = await res.json();
            setMsg(res.ok ? `Angelegt: ${json.data.inventoryCode}` : json.error ?? "Fehler");
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
              <th className="p-3">Typ</th>
              <th className="p-3">Name</th>
              <th className="p-3">Standort</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-mono">{r.inventoryCode}</td>
                <td className="p-3">{r.resourceType.name}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.location.name}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3 text-right">
                  <Select
                    value={r.status}
                    onChange={async (e) => {
                      await fetch("/api/resources", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: r.id, status: e.target.value }),
                      });
                      load();
                    }}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="DEFECT">DEFECT</option>
                    <option value="LOST">LOST</option>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
