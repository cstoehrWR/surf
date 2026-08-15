"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RefundButton({ bookingId, maxAmount }: { bookingId: string; maxAmount: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(maxAmount));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (maxAmount <= 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <div>
        <Input type="number" step="0.01" min="0.01" max={maxAmount} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          const res = await fetch("/api/payments/refund", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId, amount: Number(amount), reason: "admin_refund" }),
          });
          const json = await res.json();
          setBusy(false);
          if (!res.ok) {
            setMsg(json.error ?? "Refund fehlgeschlagen");
            return;
          }
          setMsg("Refund gebucht");
          router.refresh();
        }}
      >
        Rückerstattung
      </Button>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
    </div>
  );
}
