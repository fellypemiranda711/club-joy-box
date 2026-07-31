export type CatalogPlan = {
  slug: string;
  name: string;
  priceId: string;
  priceLabel: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  annualLabel: string;
  pairsPerYear: number;
  summary: string;
};

export const planCatalog: CatalogPlan[] = [
  {
    slug: "essencial",
    name: "Essencial",
    priceId: "plano_essencial_anual",
    priceLabel: "R$ 19,90/mês",
    monthlyPriceCents: 1990,
    annualPriceCents: 23880,
    annualLabel: "R$ 238,80/ano",
    pairsPerYear: 1,
    summary: "1 par de lentes/ano com preço direto do laboratório.",
  },
  {
    slug: "cuidado-mais",
    name: "Cuidado+",
    priceId: "plano_cuidado_mais_anual",
    priceLabel: "R$ 39,90/mês",
    monthlyPriceCents: 3990,
    annualPriceCents: 47880,
    annualLabel: "R$ 478,80/ano",
    pairsPerYear: 2,
    summary: "2 pares de lentes/ano com preço direto do laboratório.",
  },
  {
    slug: "familia",
    name: "Família",
    priceId: "plano_familia_anual",
    priceLabel: "R$ 89,90/mês",
    monthlyPriceCents: 8990,
    annualPriceCents: 107880,
    annualLabel: "R$ 1.078,80/ano",
    pairsPerYear: 6,
    summary: "Até 6 pares de lentes/ano para toda a família.",
  },
];

export function planBySlug(slug: string | undefined): CatalogPlan | undefined {
  return planCatalog.find((p) => p.slug === slug);
}

export function planByPriceId(priceId: string | undefined | null): CatalogPlan | undefined {
  return planCatalog.find((p) => p.priceId === priceId);
}

const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

export function isSubscriptionActive(sub: {
  status?: string | null;
  current_period_end?: string | null;
  expires_at?: string | null;
} | null | undefined): boolean {
  if (!sub?.status) return false;
  const end = sub.current_period_end ?? sub.expires_at;
  const notExpired = !end || new Date(end).getTime() > Date.now();
  if (ACTIVE_STATUSES.includes(sub.status)) return notExpired;
  if (sub.status === "canceled") return Boolean(end) && notExpired;
  return false;
}
