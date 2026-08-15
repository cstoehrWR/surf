"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Delivery = {
  id: string;
  event: string;
  status: string;
  attempts: number;
  createdAt: string;
};

type Endpoint = {
  id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  deliveries: Delivery[];
};

const DEFAULT_EVENTS = [
  "booking.created",
  "booking.cancelled",
  "payment.received",
  "waitlist.joined",
  "waitlist.promoted",
];

export default function WebhooksPage() {
  const [items, setItems] = useState<Endpoint[]>([]);
  const [events, setEvents] = useState<string[]>(DEFAULT_EVENTS);
  const [url, setUrl] = useState("https://webhook.site/example");
  const [selected, setSelected] = useState<string[]>(["booking.created", "booking.cancelled"]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/webhooks/endpoints");
    const json = await res.json();
    setItems(json.data ?? []);
    if (json.events) setEvents(json.events);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Webhooks</h1>
      <p className="text-sm text-slate-600">
        Outbound-Events mit HMAC-Signatur (`X-Surf-Signature`). Deliveries werden sofort zugestellt und bei
        Netzwerkfehlern erneut versucht.
      </p>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Endpoint anlegen</h2>
        <div className="mt-3 grid gap-3">
          <div>
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {events.map((ev) => (
              <label key={ev} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(ev)}
                  onChange={(e) =>
                    setSelected((s) => (e.target.checked ? [...s, ev] : s.filter((x) => x !== ev)))
                  }
                />
                {ev}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                setMsg(null);
                const res = await fetch("/api/webhooks/endpoints", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url, events: selected }),
                });
                const json = await res.json();
                if (!res.ok) {
                  setMsg(json.error ?? "Fehler");
                  return;
                }
                setMsg(`Endpoint angelegt · Secret: ${json.data.secret}`);
                load();
              }}
            >
              Speichern
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const res = await fetch("/api/webhooks/endpoints", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "process" }),
                });
                const json = await res.json();
                setMsg(`Queue: ${json.data?.processed ?? 0} verarbeitet, ${json.data?.delivered ?? 0} ok`);
                load();
              }}
            >
              Queue verarbeiten
            </Button>
          </div>
        </div>
        {msg && <p className="mt-2 text-sm text-teal-800">{msg}</p>}
      </section>
      {items.map((ep) => (
        <section key={ep.id} className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{ep.url}</p>
              <p className="text-xs text-slate-500">{ep.events.join(", ")}</p>
              <p className="mt-1 font-mono text-xs">secret: {ep.secret}</p>
            </div>
            <button
              className="text-rose-700 underline"
              onClick={async () => {
                await fetch(`/api/webhooks/endpoints?id=${ep.id}`, { method: "DELETE" });
                load();
              }}
            >
              Löschen
            </button>
          </div>
          <div className="mt-3 divide-y text-sm">
            {ep.deliveries.map((d) => (
              <p key={d.id} className="flex justify-between py-1">
                <span>
                  {d.event} · {d.status}
                </span>
                <span className="text-slate-500">
                  {new Date(d.createdAt).toLocaleString("de-DE")} · {d.attempts}x
                </span>
              </p>
            ))}
            {ep.deliveries.length === 0 && <p className="text-slate-500">Noch keine Deliveries</p>}
          </div>
        </section>
      ))}
    </div>
  );
}
