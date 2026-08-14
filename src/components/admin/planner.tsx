"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, startOfDay } from "date-fns";

type SessionRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  maxParticipants: number;
  booked: number;
  product: { name: string };
  location: { name: string };
  instructors: Array<{ instructor: { firstName: string } }>;
};

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

export function Planner({ initialView = "week" }: { initialView?: "day" | "week" }) {
  const [view, setView] = useState<"day" | "week">(initialView);
  const [anchor, setAnchor] = useState(startOfDay(new Date()));
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);

  const days = useMemo(() => {
    if (view === "day") return [anchor];
    return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));
  }, [anchor, view]);

  useEffect(() => {
    const from = days[0].toISOString();
    const to = addDays(days[days.length - 1], 1).toISOString();
    fetch(`/api/sessions?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => setSessions(d.data ?? []));
  }, [days]);

  async function dropOn(day: Date, hour: number) {
    if (!dragging) return;
    const startsAt = new Date(day);
    startsAt.setHours(hour, 0, 0, 0);
    await fetch(`/api/sessions/${dragging}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startsAt: startsAt.toISOString() }),
    });
    setDragging(null);
    const from = days[0].toISOString();
    const to = addDays(days[days.length - 1], 1).toISOString();
    const d = await fetch(`/api/sessions?from=${from}&to=${to}`).then((r) => r.json());
    setSessions(d.data ?? []);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button className="rounded-lg bg-white px-3 py-1 text-sm" onClick={() => setAnchor(addDays(anchor, view === "day" ? -1 : -7))}>
          ←
        </button>
        <button className="rounded-lg bg-white px-3 py-1 text-sm" onClick={() => setAnchor(addDays(anchor, view === "day" ? 1 : 7))}>
          →
        </button>
        <button className={`rounded-lg px-3 py-1 text-sm ${view === "day" ? "bg-teal-700 text-white" : "bg-white"}`} onClick={() => setView("day")}>
          Tag
        </button>
        <button className={`rounded-lg px-3 py-1 text-sm ${view === "week" ? "bg-teal-700 text-white" : "bg-white"}`} onClick={() => setView("week")}>
          Woche
        </button>
        <span className="text-sm text-slate-600">{anchor.toLocaleDateString("de-DE", { dateStyle: "full" })}</span>
      </div>
      <div className="overflow-auto rounded-2xl bg-white shadow-sm">
        <div className="min-w-[800px]" style={{ display: "grid", gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="border-b p-2 text-center text-xs font-semibold">
              {d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
            </div>
          ))}
          {HOURS.map((hour) => (
            <div key={`row-${hour}`} className="contents">
              <div className="border-r p-2 text-xs text-slate-500">
                {String(hour).padStart(2, "0")}:00
              </div>
              {days.map((day) => {
                const cellSessions = sessions.filter((s) => {
                  const start = new Date(s.startsAt);
                  return start.toDateString() === day.toDateString() && start.getHours() === hour;
                });
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="min-h-16 border-b border-r p-1"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOn(day, hour)}
                  >
                    {cellSessions.map((s) => (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={() => setDragging(s.id)}
                        className="cursor-grab rounded-lg bg-teal-700 p-2 text-xs text-white"
                      >
                        <p className="font-semibold">
                          {new Date(s.startsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}–
                          {new Date(s.endsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} {s.product.name}
                        </p>
                        <p>
                          {s.booked}/{s.maxParticipants} · {s.instructors.map((i) => i.instructor.firstName).join(", ") || "–"} · {s.location.name}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}
