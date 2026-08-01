import { formatBRL } from "@/lib/whatsapp";

/** Quanto o mercado (óticas de rua) cobra em relação ao valor de associado. */
export const MARKET_MULTIPLIER = 5;

export function marketPriceCents(memberPriceCents: number): number {
  return Math.round(memberPriceCents * MARKET_MULTIPLIER);
}

export function savingsCents(memberPriceCents: number, marketCents: number): number {
  return Math.max(marketCents - memberPriceCents, 0);
}

export function savingsPercent(memberPriceCents: number, marketCents: number): number {
  if (!marketCents) return 0;
  return Math.round(((marketCents - memberPriceCents) / marketCents) * 100);
}

export type VisionTier = {
  tier: number;
  title: string;
  description: string;
  /** 0–100: quanto do campo de visão é aproveitado (usado na barra visual). */
  fieldScore: number;
};

export const visionTiers: VisionTier[] = [
  {
    tier: 1,
    title: "Campo de visão básico",
    description: "Campo de leitura mais estreito, com maior adaptação. Entrada do clube.",
    fieldScore: 25,
  },
  {
    tier: 2,
    title: "Campo de visão ampliado",
    description: "Zonas de leitura e intermediária mais confortáveis no dia a dia.",
    fieldScore: 50,
  },
  {
    tier: 3,
    title: "Campo de visão amplo",
    description: "Visão nítida em quase todo o campo, com pouca distorção lateral.",
    fieldScore: 75,
  },
  {
    tier: 4,
    title: "Campo de visão premium",
    description: "Tecnologia digital de última geração: campo máximo e adaptação imediata.",
    fieldScore: 100,
  },
];

export function tierMeta(tier: number): VisionTier {
  return visionTiers.find((t) => t.tier === tier) ?? visionTiers[0]!;
}

export function formatOptionLine(option: {
  tier: number;
  title: string;
  member_price_cents: number;
  market_price_cents: number;
}): string {
  const economia = savingsCents(option.member_price_cents, option.market_price_cents);
  return [
    `${option.tier}) ${option.title}`,
    `   Associado: ${formatBRL(option.member_price_cents)}`,
    `   Média das óticas: ${formatBRL(option.market_price_cents)}`,
    `   Sua economia: ${formatBRL(economia)}`,
  ].join("\n");
}
