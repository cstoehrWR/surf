"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/card";

type Product = { id: string; name: string };
type Template = {
  id: string;
  name: string;
  version: number;
  body: string;
  minAge: number | null;
  locationId: string | null;
  active: boolean;
  products: Array<{ productId: string; product: { id: string; name: string } }>;
  _count: { signatures: number };
};

const emptyForm = {
  name: "",
  body: "Ich bestätige, dass ich schwimmen kann und die Risiken des Wassersports kenne.",
  minAge: "",
  productIds: [] as string[],
};

export default function WaiversAdminPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const [t, p] = await Promise.all([fetch("/api/waivers"), fetch("/api/products?admin=1")]);
    const tj = await t.json();
    const pj = await p.json();
    setTemplates(tj.data ?? []);
    setProducts((pj.data ?? []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(t: Template) {
    setEditId(t.id);
    setForm({
      name: t.name,
      body: t.body,
      minAge: t.minAge != null ? String(t.minAge) : "",
      productIds: t.products.map((p) => p.productId),
    });
  }

  function toggleProduct(id: string) {
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id)
        ? f.productIds.filter((x) => x !== id)
        : [...f.productIds, id],
    }));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Waiver-Vorlagen</h1>
      <p className="text-sm text-slate-600">
        Textänderungen erhöhen die Version. Alte Unterschriften bleiben gültig.
      </p>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">{editId ? "Vorlage bearbeiten" : "Neu anlegen"}</h2>
        <div className="mt-3 grid gap-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Text</Label>
            <Textarea
              className="min-h-32"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <div>
            <Label>Mindestalter (optional)</Label>
            <Input
              type="number"
              value={form.minAge}
              onChange={(e) => setForm({ ...form, minAge: e.target.value })}
            />
          </div>
          <div>
            <Label>Produkte</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.productIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              setMsg(null);
              const payload = {
                name: form.name,
                body: form.body,
                minAge: form.minAge ? Number(form.minAge) : null,
                productIds: form.productIds,
              };
              const res = await fetch(editId ? `/api/waivers/${editId}` : "/api/waivers", {
                method: editId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const json = await res.json();
              setMsg(res.ok ? "Gespeichert" : json.error ?? "Fehler");
              if (res.ok) {
                setEditId(null);
                setForm(emptyForm);
                load();
              }
            }}
          >
            Speichern
          </Button>
          {editId ? (
            <Button
              variant="outline"
              onClick={() => {
                setEditId(null);
                setForm(emptyForm);
              }}
            >
              Abbrechen
            </Button>
          ) : null}
        </div>
        {msg ? <p className="mt-2 text-sm text-teal-800">{msg}</p> : null}
      </section>

      <div className="space-y-3">
        {templates.map((t) => (
          <article key={t.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {t.name} <span className="text-slate-500">v{t.version}</span>
              </h2>
              <div className="flex items-center gap-2">
                <Badge tone={t.active ? "teal" : "slate"}>{t.active ? "aktiv" : "inaktiv"}</Badge>
                <button className="text-sm underline" onClick={() => startEdit(t)}>
                  Bearbeiten
                </button>
                <button
                  className="text-sm underline"
                  onClick={async () => {
                    await fetch(`/api/waivers/${t.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ active: !t.active }),
                    });
                    load();
                  }}
                >
                  {t.active ? "Deaktivieren" : "Aktivieren"}
                </button>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{t.body}</p>
            <p className="mt-3 text-sm">
              Produkte: {t.products.map((p) => p.product.name).join(", ") || "–"}
              {t.minAge != null ? ` · ab ${t.minAge} J.` : ""}
            </p>
            <p className="text-sm">Unterschriften: {t._count.signatures}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
