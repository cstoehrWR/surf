"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Message = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  createdAt: string;
};

export default function InboxPage() {
  const [items, setItems] = useState<Message[]>([]);

  async function load() {
    const res = await fetch("/api/contact");
    const json = await res.json();
    setItems(json.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Anfragen</h1>
      <p className="text-sm text-slate-600">Nachrichten aus dem Website-Kontaktformular.</p>
      <div className="space-y-3">
        {items.map((m) => (
          <article key={m.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {m.name} · {m.email}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(m.createdAt).toLocaleString("de-DE")} · {m.status}
                  {m.phone ? ` · ${m.phone}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {m.status === "new" && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await fetch("/api/contact", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: m.id, status: "read" }),
                      });
                      load();
                    }}
                  >
                    Gelesen
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={async () => {
                    await fetch("/api/contact", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: m.id, status: "done" }),
                    });
                    load();
                  }}
                >
                  Erledigt
                </Button>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{m.message}</p>
          </article>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500">Noch keine Anfragen.</p>}
      </div>
    </div>
  );
}
