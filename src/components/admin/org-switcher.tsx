"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Membership = {
  organizationId: string;
  role: string;
  organization: { id: string; name: string; slug: string };
};

export function OrgSwitcher() {
  const { data, update } = useSession();
  const [items, setItems] = useState<Membership[]>([]);

  useEffect(() => {
    fetch("/api/organizations?mine=1")
      .then((r) => r.json())
      .then((j) => setItems(j.data ?? []));
  }, []);

  if (items.length <= 1) {
    return (
      <p className="text-xs text-teal-200">
        {data?.user.organizationName ?? "Organisation"}
      </p>
    );
  }

  return (
    <select
      className="mt-1 w-full rounded-lg border border-teal-700 bg-teal-900 px-2 py-1 text-xs text-teal-50"
      value={data?.user.organizationId ?? ""}
      onChange={async (e) => {
        const organizationId = e.target.value;
        await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "switch", organizationId }),
        });
        await update({ organizationId });
        window.location.reload();
      }}
    >
      {items.map((m) => (
        <option key={m.organizationId} value={m.organizationId}>
          {m.organization.name}
        </option>
      ))}
    </select>
  );
}
