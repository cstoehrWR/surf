"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/card";

type Rule = {
  id: string;
  name: string;
  trigger: string;
  offsetHours: number;
  action: string;
  active: boolean;
};

const empty = {
  name: "",
  trigger: "session.upcoming",
  offsetHours: "-48",
  action: "email.reminder",
};

export default function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [log, setLog] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/automations");
    const json = await res.json();
    setRules(json.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Automatisierungen</h1>
          <p className="text-sm text-slate-600">
            Reminder, Waiver-Hinweise und Follow-ups. In Produktion per Cron (`/api/cron/automations`).
          </p>
        </div>
        <Button
          onClick={async () => {
            const res = await fetch("/api/automations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "runAll" }),
            });
            const json = await res.json();
            setLog(JSON.stringify(json.data, null, 2));
          }}
        >
          Alle jetzt ausführen
        </Button>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">{editId ? "Regel bearbeiten" : "Neue Regel"}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Trigger</Label>
            <Select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}>
              <option value="session.upcoming">session.upcoming</option>
              <option value="session.completed">session.completed</option>
            </Select>
          </div>
          <div>
            <Label>Offset (Stunden)</Label>
            <Input
              type="number"
              value={form.offsetHours}
              onChange={(e) => setForm({ ...form, offsetHours: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Aktion</Label>
            <Select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>
              <option value="email.reminder">email.reminder</option>
              <option value="email.waiver_missing">email.waiver_missing</option>
              <option value="email.followup">email.followup</option>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            onClick={async () => {
              setMsg(null);
              const payload = {
                name: form.name,
                trigger: form.trigger,
                offsetHours: Number(form.offsetHours),
                action: form.action,
              };
              const res = await fetch("/api/automations", {
                method: editId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editId ? { id: editId, ...payload } : payload),
              });
              const json = await res.json();
              setMsg(res.ok ? "Gespeichert" : json.error ?? "Fehler");
              if (res.ok) {
                setEditId(null);
                setForm(empty);
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
                setForm(empty);
              }}
            >
              Abbrechen
            </Button>
          ) : null}
        </div>
        {msg ? <p className="mt-2 text-sm text-teal-800">{msg}</p> : null}
      </section>

      <div className="space-y-3">
        {rules.map((r) => (
          <article key={r.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">{r.name}</h2>
                <p className="text-sm text-slate-600">
                  {r.trigger} · {r.offsetHours}h · {r.action}
                </p>
              </div>
              <Badge tone={r.active ? "teal" : "slate"}>{r.active ? "aktiv" : "inaktiv"}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditId(r.id);
                  setForm({
                    name: r.name,
                    trigger: r.trigger,
                    offsetHours: String(r.offsetHours),
                    action: r.action,
                  });
                }}
              >
                Bearbeiten
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await fetch("/api/automations", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: r.id, active: !r.active }),
                  });
                  load();
                }}
              >
                {r.active ? "Deaktivieren" : "Aktivieren"}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const res = await fetch("/api/automations", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: r.id, run: true }),
                  });
                  const json = await res.json();
                  setLog(JSON.stringify(json.data, null, 2));
                }}
              >
                Jetzt ausführen
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!confirm("Regel löschen?")) return;
                  await fetch(`/api/automations?id=${r.id}`, { method: "DELETE" });
                  load();
                }}
              >
                Löschen
              </Button>
            </div>
          </article>
        ))}
      </div>
      {log && (
        <pre className="overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-teal-50">{log}</pre>
      )}
    </div>
  );
}
