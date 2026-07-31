export type CatalogPlan = {
  slug: string;
  name: string;
  priceId: string;
  priceLabel: string;
  monthlyPriceCents: number;
  summary: string;
};

export const planCatalog: CatalogPlan[] = [
  {
    slug: "essencial",
    name: "Essencial",
    priceId: "plano_essencial_mensal",
    priceLabel: "10x R$ 19,90/mês",
    monthlyPriceCents: 1990,
    summary: "1 par de lentes/ano com preço direto do laboratório.",
  },
  {
    slug: "cuidado-mais",
    name: "Cuidado+",
    priceId: "plano_cuidado_mais_mensal",
    priceLabel: "10x R$ 39,90/mês",
    monthlyPriceCents: 3990,
    summary: "2 pares de lentes/ano com preço direto do laboratório.",
  },
  {
    slug: "familia",
    name: "Família",
    priceId: "plano_familia_mensal",
    priceLabel: "10x R$ 89,90/mês",
    monthlyPriceCents: 8990,
    summary: "Até 6 pares de lentes/ano para toda a família.",
  },
];

export function planBySlug(slug: string | undefined): CatalogPlan | undefined {
  return planCatalog.find((p) => p.slug === slug);
}

export function planByPriceId(priceId: string | undefined | null): CatalogPlan | undefined {
  return planCatalog.find((p) => p.priceId === priceId);
}
