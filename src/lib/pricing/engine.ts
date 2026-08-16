export type PriceContext = {
  basePrice: number;
  variantPrice?: number | null;
  participants: number;
  date: Date;
  now?: Date;
  rules: Array<{
    type: string;
    name?: string;
    priority: number;
    amount: number | null;
    percent: number | null;
    weekday: number | null;
    minParticipants: number | null;
    maxParticipants: number | null;
    validFrom?: Date | string | null;
    validTo?: Date | string | null;
    active: boolean;
  }>;
};

export type PriceBreakdown = {
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  appliedRules: Array<{ type: string; label: string; effect: number }>;
};

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function daysUntil(sessionDate: Date, now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const target = new Date(sessionDate);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

function inValidityWindow(rule: PriceContext["rules"][number], date: Date) {
  if (rule.validFrom) {
    const from = new Date(rule.validFrom);
    if (date < from) return false;
  }
  if (rule.validTo) {
    const to = new Date(rule.validTo);
    if (date > to) return false;
  }
  return true;
}

function applyAbsolute(unit: number, amount: number | null): number | null {
  if (amount == null) return null;
  return Number(amount);
}

function applyPercent(unit: number, percent: number | null): { unit: number; effect: number } | null {
  if (percent == null) return null;
  const effect = roundMoney(unit * (Number(percent) / 100));
  return { unit: roundMoney(unit - effect), effect: -effect };
}

/** Pure pricing engine: STANDARD + WEEKEND/SEASON/GROUP/EARLY_BIRD/LAST_MINUTE/DISCOUNT. */
export function calculatePrice(ctx: PriceContext): PriceBreakdown {
  const now = ctx.now ?? new Date();
  const weekday = ctx.date.getDay();
  const ahead = daysUntil(ctx.date, now);
  let unit = ctx.variantPrice ?? ctx.basePrice;
  const applied: PriceBreakdown["appliedRules"] = [
    { type: "STANDARD", label: "Standardpreis", effect: unit },
  ];

  const rules = [...ctx.rules]
    .filter((r) => r.active && inValidityWindow(r, ctx.date))
    .sort((a, b) => a.priority - b.priority);

  for (const rule of rules) {
    if (rule.weekday != null && rule.weekday !== weekday) continue;

    const label = rule.name ?? rule.type;

    if (rule.type === "CHILD" || rule.type === "ADULT") {
      const next = applyAbsolute(unit, rule.amount);
      if (next != null) {
        unit = next;
        applied.push({ type: rule.type, label, effect: unit });
      }
      continue;
    }

    if (rule.type === "WEEKEND") {
      if (weekday !== 0 && weekday !== 6) continue;
      const next = applyAbsolute(unit, rule.amount);
      if (next != null) {
        unit = next;
        applied.push({ type: rule.type, label: rule.name ?? "Wochenendpreis", effect: unit });
      } else {
        const pct = applyPercent(unit, rule.percent);
        if (pct) {
          unit = pct.unit;
          applied.push({ type: rule.type, label: rule.name ?? "Wochenendaufschlag", effect: pct.effect });
        }
      }
      continue;
    }

    if (rule.type === "SEASON") {
      const next = applyAbsolute(unit, rule.amount);
      if (next != null) {
        unit = next;
        applied.push({ type: "SEASON", label: rule.name ?? "Saisonpreis", effect: unit });
      } else {
        const pct = applyPercent(unit, rule.percent);
        if (pct) {
          unit = pct.unit;
          applied.push({ type: "SEASON", label: rule.name ?? "Saisonanpassung", effect: pct.effect });
        }
      }
      continue;
    }

    if (rule.type === "GROUP" || rule.type === "DISCOUNT") {
      if (rule.minParticipants != null && ctx.participants < rule.minParticipants) continue;
      if (rule.maxParticipants != null && ctx.participants > rule.maxParticipants) continue;
      const pct = applyPercent(unit, rule.percent);
      if (pct) {
        unit = pct.unit;
        applied.push({ type: rule.type, label, effect: pct.effect });
      } else if (rule.amount != null) {
        const effect = -Math.abs(Number(rule.amount));
        unit = roundMoney(Math.max(0, unit + effect));
        applied.push({ type: rule.type, label, effect });
      }
      continue;
    }

    if (rule.type === "EARLY_BIRD") {
      const minDays = rule.minParticipants ?? 7;
      if (ahead < minDays) continue;
      const pct = applyPercent(unit, rule.percent);
      if (pct) {
        unit = pct.unit;
        applied.push({ type: rule.type, label: rule.name ?? "Frühbucher", effect: pct.effect });
      } else if (rule.amount != null) {
        unit = Number(rule.amount);
        applied.push({ type: rule.type, label: rule.name ?? "Frühbucher", effect: unit });
      }
      continue;
    }

    if (rule.type === "LAST_MINUTE") {
      const maxDays = rule.maxParticipants ?? 2;
      if (ahead > maxDays || ahead < 0) continue;
      const pct = applyPercent(unit, rule.percent);
      if (pct) {
        // LAST_MINUTE percent is surcharge if positive amount absent; treat percent as discount by default
        unit = pct.unit;
        applied.push({ type: rule.type, label: rule.name ?? "Last Minute", effect: pct.effect });
      } else if (rule.amount != null) {
        unit = Number(rule.amount);
        applied.push({ type: rule.type, label: rule.name ?? "Last Minute", effect: unit });
      }
      continue;
    }

    // Participant-range absolute override for custom types
    if (rule.minParticipants != null && ctx.participants < rule.minParticipants) continue;
    if (rule.maxParticipants != null && ctx.participants > rule.maxParticipants) continue;
    if (rule.percent != null) {
      const pct = applyPercent(unit, rule.percent);
      if (pct) {
        unit = pct.unit;
        applied.push({ type: rule.type, label, effect: pct.effect });
      }
    } else if (rule.amount != null) {
      unit = Number(rule.amount);
      applied.push({ type: rule.type, label, effect: unit });
    }
  }

  const lineTotal = roundMoney(unit * ctx.participants);
  return { unitPrice: unit, quantity: ctx.participants, lineTotal, appliedRules: applied };
}
