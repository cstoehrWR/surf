"use client";

import { useState } from "react";

export function AttendanceToggle({ id, initial }: { id: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <button
      className={`rounded-lg px-3 py-1 text-xs font-semibold ${on ? "bg-teal-700 text-white" : "bg-slate-100"}`}
      onClick={async () => {
        const next = !on;
        setOn(next);
        await fetch(`/api/sessions/attendance/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attendance: next }),
        });
      }}
    >
      {on ? "anwesend" : "offen"}
    </button>
  );
}
