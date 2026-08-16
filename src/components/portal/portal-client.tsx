"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";

type Participant = {
  id: string;
  firstName: string;
  lastName: string;
  age: number | null;
  dateOfBirth: string | null;
  heightCm: number | null;
  weightKg: number | string | null;
  surfLevel: string;
  wetsuitSize: string | null;
  shoeSize: string | null;
  canSwim: boolean;
  notes: string | null;
};

type WaiverItem = {
  participantId: string;
  firstName: string;
  lastName: string;
  age: number | null;
  requiresGuardian: boolean;
  signed: boolean;
  template: { id: string; name: string; version: number; body: string };
};

type Props = {
  token: string;
  booking: {
    id: string;
    number: string;
    status: string;
    paymentStatus: string;
    total: number;
    amountPaid: number;
    openAmount: number;
    locked: boolean;
  };
  participants: Participant[];
  cancellation: {
    allowed: boolean;
    hours: number;
    deadline: string | null;
    reason: string | null;
  };
  waivers: WaiverItem[];
  sessionLabel: string;
  sessionWhen: string;
};

export function PortalClient({ token, booking, participants, cancellation, waivers, sessionLabel, sessionWhen }: Props) {
  const router = useRouter();
  const [people, setPeople] = useState(participants);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeWaiver, setActiveWaiver] = useState<WaiverItem | null>(null);
  const [signerName, setSignerName] = useState("");
  const [guardian, setGuardian] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState("");

  const missingWaivers = useMemo(() => waivers.filter((w) => !w.signed).length, [waivers]);

  async function saveParticipant(p: Participant) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/portal/${token}/participants/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: p.firstName,
        lastName: p.lastName,
        age: p.age,
        dateOfBirth: p.dateOfBirth,
        heightCm: p.heightCm,
        weightKg: p.weightKg ? Number(p.weightKg) : null,
        surfLevel: p.surfLevel,
        wetsuitSize: p.wetsuitSize,
        shoeSize: p.shoeSize,
        canSwim: p.canSwim,
        notes: p.notes,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Speichern fehlgeschlagen");
      return;
    }
    setMessage("Teilnehmerdaten gespeichert");
    router.refresh();
  }

  async function payOpen() {
    setBusy(true);
    const res = await fetch(`/api/portal/${token}/pay`, { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Zahlung fehlgeschlagen");
      return;
    }
    if (json.data?.redirectUrl) {
      window.location.href = json.data.redirectUrl;
      return;
    }
    router.refresh();
  }

  async function cancelBooking() {
    if (!confirm("Buchung wirklich stornieren?")) return;
    setBusy(true);
    const res = await fetch(`/api/portal/${token}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "customer_portal" }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Storno nicht möglich");
      return;
    }
    setMessage("Buchung storniert");
    router.refresh();
  }

  async function submitWaiver() {
    if (!activeWaiver) return;
    setBusy(true);
    const res = await fetch(`/api/portal/${token}/waivers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId: activeWaiver.participantId,
        templateId: activeWaiver.template.id,
        signerName,
        guardian: guardian || activeWaiver.requiresGuardian,
        accepted: true,
        signatureData: signature || `typed:${signerName}`,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? json.code ?? "Waiver fehlgeschlagen");
      return;
    }
    setActiveWaiver(null);
    setSignerName("");
    setSignature("");
    setAccepted(false);
    setGuardian(false);
    setMessage("Waiver unterschrieben");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-wide text-teal-700">Buchung</p>
        <h1 className="text-3xl font-semibold">{booking.number}</h1>
        <p className="mt-2">{sessionLabel}</p>
        <p className="text-slate-600">{sessionWhen}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1">{booking.status}</span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">{booking.paymentStatus}</span>
          {missingWaivers > 0 && <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-800">{missingWaivers} Waiver offen</span>}
        </div>
        <p className="mt-4 text-lg font-semibold">
          {formatMoney(booking.total)} · bezahlt {formatMoney(booking.amountPaid)}
          {booking.openAmount > 0 ? ` · offen ${formatMoney(booking.openAmount)}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {booking.openAmount > 0 && booking.status !== "CANCELLED" && (
            <Button disabled={busy} onClick={payOpen}>
              Offenen Betrag zahlen
            </Button>
          )}
          {cancellation.allowed ? (
            <Button variant="danger" disabled={busy} onClick={cancelBooking}>
              Stornieren (bis {cancellation.hours}h vorher)
            </Button>
          ) : (
            <p className="text-sm text-slate-500">
              Storno nicht möglich
              {cancellation.deadline
                ? ` (Frist war ${new Date(cancellation.deadline).toLocaleString("de-DE")})`
                : ""}
            </p>
          )}
        </div>
      </section>

      {message && <p className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">{message}</p>}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Teilnehmerdaten</h2>
        {people.map((p, idx) => (
          <div key={p.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="font-semibold">
              {p.firstName} {p.lastName}
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <Label>Vorname</Label>
                <Input
                  disabled={booking.locked}
                  value={p.firstName}
                  onChange={(e) => setPeople((all) => all.map((x, i) => (i === idx ? { ...x, firstName: e.target.value } : x)))}
                />
              </div>
              <div>
                <Label>Nachname</Label>
                <Input
                  disabled={booking.locked}
                  value={p.lastName}
                  onChange={(e) => setPeople((all) => all.map((x, i) => (i === idx ? { ...x, lastName: e.target.value } : x)))}
                />
              </div>
              <div>
                <Label>Alter</Label>
                <Input
                  disabled={booking.locked}
                  type="number"
                  value={p.age ?? ""}
                  onChange={(e) =>
                    setPeople((all) =>
                      all.map((x, i) => (i === idx ? { ...x, age: e.target.value ? Number(e.target.value) : null } : x)),
                    )
                  }
                />
              </div>
              <div>
                <Label>Geburtsdatum</Label>
                <Input
                  disabled={booking.locked}
                  type="date"
                  value={p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : ""}
                  onChange={(e) =>
                    setPeople((all) => all.map((x, i) => (i === idx ? { ...x, dateOfBirth: e.target.value || null } : x)))
                  }
                />
              </div>
              <div>
                <Label>Größe (cm)</Label>
                <Input
                  disabled={booking.locked}
                  type="number"
                  value={p.heightCm ?? ""}
                  onChange={(e) =>
                    setPeople((all) =>
                      all.map((x, i) => (i === idx ? { ...x, heightCm: e.target.value ? Number(e.target.value) : null } : x)),
                    )
                  }
                />
              </div>
              <div>
                <Label>Gewicht (kg)</Label>
                <Input
                  disabled={booking.locked}
                  type="number"
                  value={p.weightKg ?? ""}
                  onChange={(e) => setPeople((all) => all.map((x, i) => (i === idx ? { ...x, weightKg: e.target.value } : x)))}
                />
              </div>
              <div>
                <Label>Surflevel</Label>
                <Select
                  disabled={booking.locked}
                  value={p.surfLevel}
                  onChange={(e) => setPeople((all) => all.map((x, i) => (i === idx ? { ...x, surfLevel: e.target.value } : x)))}
                >
                  <option value="NONE">Kein</option>
                  <option value="BEGINNER">Anfänger</option>
                  <option value="INTERMEDIATE">Fortgeschritten</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="PRO">Pro</option>
                </Select>
              </div>
              <div>
                <Label>Neoprengröße</Label>
                <Input
                  disabled={booking.locked}
                  value={p.wetsuitSize ?? ""}
                  onChange={(e) => setPeople((all) => all.map((x, i) => (i === idx ? { ...x, wetsuitSize: e.target.value } : x)))}
                />
              </div>
              <div>
                <Label>Schuhgröße</Label>
                <Input
                  disabled={booking.locked}
                  value={p.shoeSize ?? ""}
                  onChange={(e) => setPeople((all) => all.map((x, i) => (i === idx ? { ...x, shoeSize: e.target.value } : x)))}
                />
              </div>
              <label className="mt-6 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={booking.locked}
                  checked={p.canSwim}
                  onChange={(e) => setPeople((all) => all.map((x, i) => (i === idx ? { ...x, canSwim: e.target.checked } : x)))}
                />
                Schwimmfähig
              </label>
              <div className="md:col-span-2">
                <Label>Hinweise</Label>
                <Textarea
                  disabled={booking.locked}
                  value={p.notes ?? ""}
                  onChange={(e) => setPeople((all) => all.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x)))}
                />
              </div>
            </div>
            {!booking.locked && (
              <Button className="mt-4" disabled={busy} onClick={() => saveParticipant(people[idx])}>
                Speichern
              </Button>
            )}
          </div>
        ))}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Teilnahme- / Haftungserklärung</h2>
        <ul className="mt-4 space-y-3">
          {waivers.map((w) => (
            <li key={w.participantId} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <p className="font-medium">
                  {w.firstName} {w.lastName}
                </p>
                <p className="text-sm text-slate-600">
                  {w.template.name} v{w.template.version}
                  {w.requiresGuardian ? " · Erziehungsberechtigter nötig" : ""}
                </p>
              </div>
              {w.signed ? (
                <span className="text-sm font-semibold text-teal-800">Unterschrieben</span>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveWaiver(w);
                    setGuardian(w.requiresGuardian);
                    setSignerName(w.requiresGuardian ? "" : `${w.firstName} ${w.lastName}`);
                  }}
                >
                  Unterschreiben
                </Button>
              )}
            </li>
          ))}
          {waivers.length === 0 && <p className="text-sm text-slate-500">Keine Waiver für diese Buchung erforderlich.</p>}
        </ul>
      </section>

      {activeWaiver && (
        <section className="rounded-2xl border border-teal-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">
            {activeWaiver.template.name} (Version {activeWaiver.template.version})
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Für {activeWaiver.firstName} {activeWaiver.lastName}
          </p>
          <div className="mt-4 max-h-56 overflow-auto rounded-xl bg-slate-50 p-4 text-sm whitespace-pre-wrap">
            {activeWaiver.template.body}
          </div>
          <div className="mt-4 grid gap-3">
            <div>
              <Label>Name des Unterzeichners</Label>
              <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
            </div>
            <div>
              <Label>Signatur (Name tippen oder Zeichen)</Label>
              <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Unterschrift" />
            </div>
            {activeWaiver.requiresGuardian && (
              <label className="flex gap-2 text-sm">
                <input type="checkbox" checked={guardian} onChange={(e) => setGuardian(e.target.checked)} />
                Ich bin erziehungsberechtigt und unterschreibe für die minderjährige Person.
              </label>
            )}
            <label className="flex gap-2 text-sm">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              Ich akzeptiere die Erklärung. Eine einmal unterzeichnete Version kann nicht still geändert werden.
            </label>
            <div className="flex gap-2">
              <Button disabled={busy || !accepted || !signerName} onClick={submitWaiver}>
                Verbindlich unterschreiben
              </Button>
              <Button variant="outline" onClick={() => setActiveWaiver(null)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
