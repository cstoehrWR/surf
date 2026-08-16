import { Planner } from "@/components/admin/planner";

export default function CalendarPage() {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-semibold">Kalender</h1>
      <Planner initialView="week" />
    </div>
  );
}
