"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Hours = { weekday: number; openTime: string; closeTime: string };
type Blackout = { id: string; startsAt: string; endsAt: string; reason: string | null };
type Location = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  active: boolean;
  openingHours?: Hours[];
  blackouts?: Blackout[];
};

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function defaultHours(existing?: Hours[]) {
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    const row = existing?.find((h) => h.weekday === weekday);
    return {
      weekday,
      openTime: row?.openTime ?? "08:00",
      closeTime: row?.closeTime ?? "18:00",
      closed: !row,
    };
  });
}

export default function LocationsAdminPage() {
  const [items, setItems] = useState<Location[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", address: "" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hoursEdit, setHoursEdit] = useState<
    Array<{ weekday: number; openTime: string; closeTime: string; closed: boolean }>
  >([]);
  const [blackoutForm, setBlackoutForm] = useState({ startsAt: "", endsAt: "", reason: "" });

  async function load() {
    const res = await fetch("/api/locations?admin=1");
    const json = await res.json();
    setItems(json.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function openEditor(l: Location) {
    setExpanded(l.id);
    setHoursEdit(defaultHours(l.openingHours));
    setBlackoutForm({ startsAt: "", endsAt: "", reason: "" });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Standorte</h1>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Neu anlegen</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                  slug: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                })
              }
            />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div>
            <Label>Adresse</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>
        <Button
          className="mt-3"
          onClick={async () => {
            setMsg(null);
            const res = await fetch("/api/locations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });
            const json = await res.json();
            setMsg(res.ok ? `Angelegt: ${json.data.name}` : json.error ?? "Fehler");
            if (res.ok) load();
          }}
        >
          Speichern
        </Button>
        {msg && <p className="mt-2 text-sm text-teal-800">{msg}</p>}
      </section>

      <div className="grid gap-3">
        {items.map((l) => (
          <div key={l.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{l.name}</p>
                <p className="text-sm text-slate-600">
                  {l.slug} · {l.address}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <button className="underline" onClick={() => openEditor(l)}>
                  Öffnungszeiten
                </button>
                <button
                  className="underline"
                  onClick={async () => {
                    await fetch("/api/locations", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: l.id, active: !l.active }),
                    });
                    load();
                  }}
                >
                  {l.active ? "Deaktivieren" : "Aktivieren"}
                </button>
              </div>
            </div>

            {expanded === l.id ? (
              <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                <div>
                  <h3 className="font-medium">Öffnungszeiten</h3>
                  <div className="mt-2 space-y-2">
                    {hoursEdit.map((h, idx) => (
                      <div key={h.weekday} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="w-8 font-medium">{WEEKDAYS[h.weekday]}</span>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={!h.closed}
                            onChange={(e) => {
                              const next = [...hoursEdit];
                              next[idx] = { ...h, closed: !e.target.checked };
                              setHoursEdit(next);
                            }}
                          />
                          offen
                        </label>
                        <Input
                          className="w-28"
                          value={h.openTime}
                          disabled={h.closed}
                          onChange={(e) => {
                            const next = [...hoursEdit];
                            next[idx] = { ...h, openTime: e.target.value };
                            setHoursEdit(next);
                          }}
                        />
                        <span>–</span>
                        <Input
                          className="w-28"
                          value={h.closeTime}
                          disabled={h.closed}
                          onChange={(e) => {
                            const next = [...hoursEdit];
                            next[idx] = { ...h, closeTime: e.target.value };
                            setHoursEdit(next);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    className="mt-3"
                    variant="outline"
                    onClick={async () => {
                      const res = await fetch(`/api/locations/${l.id}/hours`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ hours: hoursEdit }),
                      });
                      setMsg(res.ok ? "Öffnungszeiten gespeichert" : "Fehler beim Speichern");
                      if (res.ok) load();
                    }}
                  >
                    Zeiten speichern
                  </Button>
                </div>

                <div>
                  <h3 className="font-medium">Sperrzeiten</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {(l.blackouts ?? []).map((b) => (
                      <li key={b.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {new Date(b.startsAt).toLocaleString("de-DE")} –{" "}
                          {new Date(b.endsAt).toLocaleString("de-DE")}
                          {b.reason ? ` · ${b.reason}` : ""}
                        </span>
                        <button
                          className="text-rose-700 underline"
                          onClick={async () => {
                            await fetch(`/api/locations/${l.id}/blackouts?blackoutId=${b.id}`, {
                              method: "DELETE",
                            });
                            load();
                          }}
                        >
                          Entfernen
                        </button>
                      </li>
                    ))}
                    {(l.blackouts ?? []).length === 0 ? (
                      <li className="text-slate-500">Keine Sperrzeiten</li>
                    ) : null}
                  </ul>
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    <div>
                      <Label>Von</Label>
                      <Input
                        type="datetime-local"
                        value={blackoutForm.startsAt}
                        onChange={(e) => setBlackoutForm({ ...blackoutForm, startsAt: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Bis</Label>
                      <Input
                        type="datetime-local"
                        value={blackoutForm.endsAt}
                        onChange={(e) => setBlackoutForm({ ...blackoutForm, endsAt: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Grund</Label>
                      <Input
                        value={blackoutForm.reason}
                        onChange={(e) => setBlackoutForm({ ...blackoutForm, reason: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    className="mt-2"
                    variant="outline"
                    onClick={async () => {
                      const res = await fetch(`/api/locations/${l.id}/blackouts`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(blackoutForm),
                      });
                      setMsg(res.ok ? "Sperrzeit angelegt" : "Fehler");
                      if (res.ok) {
                        setBlackoutForm({ startsAt: "", endsAt: "", reason: "" });
                        load();
                      }
                    }}
                  >
                    Sperrzeit hinzufügen
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
