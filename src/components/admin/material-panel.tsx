"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

type ResourceOption = {
  id: string;
  inventoryCode: string;
  name: string;
  resourceType: { name: string };
};

type Assignment = {
  id: string;
  returnedAt: string | null;
  damageNote: string | null;
  resource: { id: string; inventoryCode: string };
};

export function MaterialPanel(props: {
  sessionParticipantId: string;
  locationId: string;
  assignments: Assignment[];
}) {
  const router = useRouter();
  const [options, setOptions] = useState<ResourceOption[]>([]);
  const [resourceId, setResourceId] = useState("");
  const [damage, setDamage] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/resources/assignments?locationId=${props.locationId}`)
      .then((r) => r.json())
      .then((d) => setOptions(d.data ?? []));
  }, [props.locationId]);

  async function assign() {
    setMessage(null);
    const res = await fetch("/api/resources/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionParticipantId: props.sessionParticipantId,
        resourceId,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Zuordnung fehlgeschlagen");
      return;
    }
    setResourceId("");
    router.refresh();
  }

  async function returnItem(assignmentId: string) {
    setMessage(null);
    const res = await fetch("/api/resources/assignments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId,
        damageNote: damage[assignmentId] || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Rückgabe fehlgeschlagen");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap gap-1">
        {props.assignments.map((a) => (
          <div key={a.id} className="rounded-lg bg-slate-50 p-2">
            <p className="font-semibold">{a.resource.inventoryCode}</p>
            {a.returnedAt ? (
              <p className="text-slate-500">zurück {a.damageNote ? `· Schaden: ${a.damageNote}` : ""}</p>
            ) : (
              <div className="mt-1 space-y-1">
                <Input
                  placeholder="Schaden (optional)"
                  value={damage[a.id] ?? ""}
                  onChange={(e) => setDamage((d) => ({ ...d, [a.id]: e.target.value }))}
                />
                <Button variant="outline" onClick={() => returnItem(a.id)}>
                  Rückgabe
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <Select value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
          <option value="">Material wählen</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.inventoryCode} · {o.resourceType.name}
            </option>
          ))}
        </Select>
        <Button disabled={!resourceId} onClick={assign}>
          Ausgeben
        </Button>
      </div>
      {message && <p className="text-rose-700">{message}</p>}
    </div>
  );
}
