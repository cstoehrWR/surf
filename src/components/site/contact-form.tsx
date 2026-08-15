"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

export function ContactForm({
  orgSlug,
  organizationId,
  pageSlug,
}: {
  orgSlug: string;
  organizationId?: string;
  pageSlug?: string;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      className="mt-4 grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, orgSlug, organizationId, pageSlug }),
        });
        const json = await res.json();
        setBusy(false);
        if (!res.ok) {
          setMsg(json.error ?? "Senden fehlgeschlagen");
          return;
        }
        setMsg("Danke – wir melden uns.");
        setForm({ name: "", email: "", phone: "", message: "" });
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>E-Mail</Label>
          <Input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Telefon (optional)</Label>
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div>
        <Label>Nachricht</Label>
        <Textarea
          required
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </div>
      <Button type="submit" disabled={busy}>
        Nachricht senden
      </Button>
      {msg && <p className="text-sm text-teal-800">{msg}</p>}
    </form>
  );
}
