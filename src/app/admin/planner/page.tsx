import { Planner } from "@/components/admin/planner";

export default function PlannerPage() {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-semibold">Session Planner</h1>
      <p className="mb-4 text-sm text-slate-600">Sessions per Drag-and-drop auf eine andere Uhrzeit ziehen. Speicherung erfolgt serverseitig.</p>
      <Planner />
    </div>
  );
}
