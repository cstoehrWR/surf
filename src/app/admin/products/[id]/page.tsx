"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  taxRate: number;
  minParticipants: number;
  maxParticipants: number;
  bookingLeadHours: number;
  requiredInstructors: number;
  instructorRatio: number;
  published: boolean;
  variants: Array<{ id: string; name: string; price: number }>;
  requirements: Array<{ id: string; quantityPerParticipant: number; resourceType: { name: string } }>;
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/products/${params.id}`);
    const json = await res.json();
    setProduct(json.data ?? null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (!product) return <p>Laden…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">{product.name}</h1>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input
              value={product.name}
              onChange={(e) => setProduct({ ...product, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Preis (€)</Label>
            <Input
              type="number"
              value={product.basePrice}
              onChange={(e) => setProduct({ ...product, basePrice: Number(e.target.value) })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Beschreibung</Label>
            <Textarea
              value={product.description}
              onChange={(e) => setProduct({ ...product, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Min TN</Label>
            <Input
              type="number"
              value={product.minParticipants}
              onChange={(e) => setProduct({ ...product, minParticipants: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Max TN</Label>
            <Input
              type="number"
              value={product.maxParticipants}
              onChange={(e) => setProduct({ ...product, maxParticipants: Number(e.target.value) })}
            />
          </div>
        </div>
        <Button
          className="mt-3"
          onClick={async () => {
            setMsg(null);
            const res = await fetch(`/api/products/${product.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: product.name,
                description: product.description,
                basePrice: product.basePrice,
                minParticipants: product.minParticipants,
                maxParticipants: product.maxParticipants,
              }),
            });
            const json = await res.json();
            setMsg(res.ok ? "Gespeichert" : json.error ?? "Fehler");
            if (res.ok) load();
          }}
        >
          Speichern
        </Button>
        {msg && <p className="mt-2 text-sm text-teal-800">{msg}</p>}
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <p>
          Steuer {product.taxRate}% · Vorlauf {product.bookingLeadHours}h · Instructoren min.{" "}
          {product.requiredInstructors}, Ratio 1:{product.instructorRatio}
        </p>
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Varianten</h2>
        {product.variants.map((v) => (
          <p key={v.id}>
            {v.name}: {formatMoney(v.price)}
          </p>
        ))}
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Ressourcenbedarf</h2>
        {product.requirements.map((r) => (
          <p key={r.id}>
            {r.resourceType.name}: {r.quantityPerParticipant} / Teilnehmer
          </p>
        ))}
      </section>
    </div>
  );
}
