"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function VoucherRedeem({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="mt-4 rounded-xl bg-slate-50 p-3">
      <Label>Gutschein einlösen</Label>
      <div className="mt-1 flex gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" />
        <Button
          variant="outline"
          onClick={async () => {
            setMsg(null);
            const res = await fetch("/api/vouchers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "redeem", code, bookingId }),
            });
            const json = await res.json();
            if (!res.ok) {
              setMsg(json.error ?? "Einlösung fehlgeschlagen");
              return;
            }
            setMsg(`Eingelöst: ${json.data.applied} €`);
            router.refresh();
          }}
        >
          Einlösen
        </Button>
      </div>
      {msg && <p className="mt-1 text-sm text-slate-600">{msg}</p>}
    </div>
  );
}
