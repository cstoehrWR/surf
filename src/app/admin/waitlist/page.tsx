"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Entry = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  participants: number;
  notifiedAt: string | null;
  holdUntil: string | null;
  createdAt: string;
  session: {
    id: string;
    startsAt: string;
    product: { name: string };
    location: { name: string };
  };
};

export default function WaitlistPage() {
  const [items, setItems] = useState<Entry[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/waitlist");
    const json = await res.json();
    setItems(json.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Warteliste</h1>
      <p className="text-sm text-slate-600">
        Bei Storno wird automatisch der nächste Eintrag benachrichtigt und erhält 24 Stunden Hold.
      </p>
      {msg && <p className="text-sm text-teal-800">{msg}</p>}
      <section className="overflow-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Gast</th>
              <th className="p-3">Session</th>
              <th className="p-3">TN</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">
                  {e.firstName} {e.lastName}
                  <div className="text-xs text-slate-500">{e.email}</div>
                </td>
                <td className="p-3">
                  {e.session.product.name}
                  <div className="text-xs text-slate-500">
                    {new Date(e.session.startsAt).toLocaleString("de-DE")} · {e.session.location.name}
                  </div>
                </td>
                <td className="p-3">{e.participants}</td>
                <td className="p-3">
                  {e.notifiedAt
                    ? `Benachrichtigt bis ${e.holdUntil ? new Date(e.holdUntil).toLocaleString("de-DE") : "–"}`
                    : "Wartend"}
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setMsg(null);
                        const res = await fetch("/api/waitlist", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "promote", sessionId: e.session.id }),
                        });
                        const json = await res.json();
                        setMsg(json.data ? `Promoted: ${json.data.email}` : "Kein freier Platz / Hold aktiv");
                        load();
                      }}
                    >
                      Promote
                    </Button>
                    <button
                      className="text-rose-700 underline"
                      onClick={async () => {
                        await fetch("/api/waitlist", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "remove", id: e.id }),
                        });
                        load();
                      }}
                    >
                      Entfernen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="p-4 text-slate-500" colSpan={5}>
                  Keine Einträge
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
