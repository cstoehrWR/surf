"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CheckinButton({ bookingId, participantId }: { bookingId: string; participantId: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant={done ? "outline" : "primary"}
      onClick={async () => {
        await fetch(`/api/bookings/${bookingId}/checkin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantIds: [participantId] }),
        });
        setDone(true);
      }}
    >
      {done ? "Eingecheckt" : "Check-in"}
    </Button>
  );
}
