export function shouldPromoteWaitlist(params: {
  freeSlots: number;
  entryParticipants: number;
  hasActiveHold: boolean;
}) {
  if (params.hasActiveHold) return false;
  if (params.freeSlots <= 0) return false;
  return params.entryParticipants <= params.freeSlots;
}

export function holdExpiresAt(notifiedAt: Date, holdHours: number) {
  return new Date(notifiedAt.getTime() + holdHours * 60 * 60 * 1000);
}
