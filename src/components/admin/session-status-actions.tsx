"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const ACTIONS: { status: string; label: string }[] = [
  { status: "CONFIRMED", label: "Bestätigen" },
  { status: "WEATHER_CHECK", label: "Wetter-Check" },
  { status: "POSTPONED", label: "Verschieben" },
  { status: "CANCELLED", label: "Absagen" },
  { status: "PLANNED", label: "Zurück auf geplant" },
];

export function SessionStatusActions({
  sessionId,
  status,
}: {
  sessionId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function setStatus(next: string) {
    if (next === "CANCELLED" && !confirm("Session absagen und Teilnehmer benachrichtigen?")) return;
    if (next === "POSTPONED" && !confirm("Session als verschoben markieren und benachrichtigen?")) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, notify: true }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(json.error ?? "Status konnte nicht geändert werden");
      return;
    }
    setMsg(json.data?.notified ? `Status ${next} · ${json.data.notified} benachrichtigt` : `Status ${next}`);
    router.refresh();
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="font-semibold">Session-Status</h2>
      <p className="mt-1 text-sm text-slate-600">Aktuell: {status}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ACTIONS.filter((a) => a.status !== status).map((a) => (
          <Button key={a.status} variant="outline" disabled={busy} onClick={() => void setStatus(a.status)}>
            {a.label}
          </Button>
        ))}
      </div>
      {msg ? <p className="mt-2 text-sm text-slate-600">{msg}</p> : null}
    </section>
  );
}
