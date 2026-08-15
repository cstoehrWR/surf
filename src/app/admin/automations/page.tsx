"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";

type Rule = {
  id: string;
  name: string;
  trigger: string;
  offsetHours: number;
  action: string;
  active: boolean;
};

export default function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [log, setLog] = useState<string | null>(null);

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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Automatisierungen</h1>
          <p className="text-sm text-slate-600">Regeln können aktiviert/deaktiviert und manuell ausgeführt werden.</p>
        </div>
        <Button
          onClick={async () => {
            const res = await fetch("/api/automations", { method: "POST", body: "{}" });
            const json = await res.json();
            setLog(JSON.stringify(json.data, null, 2));
          }}
        >
          Alle jetzt ausführen
        </Button>
      </div>
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
            <div className="mt-3 flex gap-2">
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
