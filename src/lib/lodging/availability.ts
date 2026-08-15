/** Pure lodging availability helpers (nights × units). */

export function eachNight(checkIn: Date, checkOut: Date): Date[] {
  const nights: Date[] = [];
  const cursor = new Date(checkIn);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(0, 0, 0, 0);
  while (cursor < end) {
    nights.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return nights;
}

export function nightsCount(checkIn: Date, checkOut: Date) {
  return eachNight(checkIn, checkOut).length;
}

export function computeLodgingAvailability(params: {
  units: Array<{ id: string; capacity: number; active: boolean }>;
  occupied: Array<{ unitId: string; night: Date | string }>;
  checkIn: Date;
  checkOut: Date;
  guests: number;
}) {
  const nights = eachNight(params.checkIn, params.checkOut);
  if (nights.length === 0) {
    return { available: false, freeUnits: 0, nights: 0, reasons: ["INVALID_RANGE"] as string[] };
  }

  const occupiedSet = new Set(
    params.occupied.map((o) => {
      const d = new Date(o.night);
      d.setHours(0, 0, 0, 0);
      return `${o.unitId}:${d.toISOString().slice(0, 10)}`;
    }),
  );

  const eligible = params.units.filter((u) => u.active && u.capacity >= params.guests);
  const free = eligible.filter((u) =>
    nights.every((n) => !occupiedSet.has(`${u.id}:${n.toISOString().slice(0, 10)}`)),
  );

  return {
    available: free.length > 0,
    freeUnits: free.length,
    nights: nights.length,
    unitIds: free.map((u) => u.id),
    reasons: free.length ? ([] as string[]) : (["NO_UNIT"] as string[]),
  };
}

export function lodgingLineTotal(params: {
  nightlyRate: number;
  nights: number;
  units: number;
}) {
  return Math.round(params.nightlyRate * params.nights * params.units * 100) / 100;
}
