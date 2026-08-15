"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BookingActions({
  bookingId,
  accessToken,
  status,
  openAmount,
}: {
  bookingId: string;
  accessToken: string;
  status: string;
  openAmount: number;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const portalPath = `/portal/${accessToken}`;

  async function cashPay() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, method: "CASH", amount: openAmount }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(json.error ?? "Barzahlung fehlgeschlagen");
      return;
    }
    setMsg("Barzahlung gebucht");
    router.refresh();
  }

  async function cancel() {
    if (!confirm("Buchung wirklich stornieren?")) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || "admin_cancel" }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(json.error ?? "Storno fehlgeschlagen");
      return;
    }
    setMsg("Buchung storniert");
    router.refresh();
  }

  async function copyPortal() {
    const url = `${window.location.origin}${portalPath}`;
    try {
      await navigator.clipboard.writeText(url);
      setMsg("Portal-Link kopiert");
    } catch {
      setMsg(url);
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => void copyPortal()}>
          Portal-Link kopieren
        </Button>
        <a className="inline-flex items-center text-sm text-teal-800 underline" href={portalPath} target="_blank" rel="noreferrer">
          Portal öffnen
        </a>
        {openAmount > 0 && status !== "CANCELLED" ? (
          <Button disabled={busy} onClick={() => void cashPay()}>
            Barzahlung ({openAmount.toFixed(2)} €)
          </Button>
        ) : null}
      </div>
      {status !== "CANCELLED" ? (
        <div className="flex flex-wrap items-end gap-2">
          <Input
            placeholder="Storno-Grund"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button variant="outline" disabled={busy} onClick={() => void cancel()}>
            Stornieren
          </Button>
        </div>
      ) : null}
      {msg ? <p className="text-sm text-slate-600">{msg}</p> : null}
    </div>
  );
}
