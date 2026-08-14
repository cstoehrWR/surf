export type PriceContext = {
  basePrice: number;
  variantPrice?: number | null;
  participants: number;
  date: Date;
  rules: Array<{
    type: string;
    priority: number;
    amount: number | null;
    percent: number | null;
    weekday: number | null;
    minParticipants: number | null;
    maxParticipants: number | null;
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

export function calculatePrice(ctx: PriceContext): PriceBreakdown {
  const weekday = ctx.date.getDay();
  let unit = ctx.variantPrice ?? ctx.basePrice;
  const applied: PriceBreakdown["appliedRules"] = [
    { type: "STANDARD", label: "Standardpreis", effect: unit },
  ];

  const rules = [...ctx.rules]
    .filter((r) => r.active)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of rules) {
    if (rule.weekday != null && rule.weekday !== weekday) continue;
    if (rule.minParticipants != null && ctx.participants < rule.minParticipants) continue;
    if (rule.maxParticipants != null && ctx.participants > rule.maxParticipants) continue;

    if (rule.type === "CHILD" || rule.type === "ADULT") {
      if (rule.amount != null) {
        unit = Number(rule.amount);
        applied.push({ type: rule.type, label: rule.type, effect: unit });
      }
      continue;
    }

    if (rule.type === "WEEKEND" && (weekday === 0 || weekday === 6) && rule.amount != null) {
      unit = Number(rule.amount);
      applied.push({ type: rule.type, label: "Wochenendpreis", effect: unit });
    }

    if (rule.percent != null && (rule.type === "DISCOUNT" || rule.type === "GROUP")) {
      const effect = roundMoney(unit * (Number(rule.percent) / 100));
      unit = roundMoney(unit - effect);
      applied.push({ type: rule.type, label: rule.type, effect: -effect });
    }

    if (rule.type === "SEASON" && rule.amount != null) {
      unit = Number(rule.amount);
      applied.push({ type: "SEASON", label: "Saisonpreis", effect: unit });
    }
  }

  const lineTotal = roundMoney(unit * ctx.participants);
  return { unitPrice: unit, quantity: ctx.participants, lineTotal, appliedRules: applied };
}
