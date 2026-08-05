export const FULFILLMENT_STEPS = [
  { key: "paid", label: "Pagamento confirmado", hint: "Recebemos o pagamento do seu pedido." },
  { key: "in_production", label: "Em produção", hint: "O laboratório está fabricando suas lentes." },
  { key: "shipped", label: "Enviado", hint: "Seu pedido saiu do laboratório." },
  { key: "delivered", label: "Entregue", hint: "Pedido entregue. Boa visão!" },
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STEPS)[number]["key"];

export const fulfillmentLabels: Record<string, string> = Object.fromEntries(
  FULFILLMENT_STEPS.map((s) => [s.key, s.label]),
);

export function fulfillmentIndex(status: string | null | undefined) {
  const i = FULFILLMENT_STEPS.findIndex((s) => s.key === status);
  return i < 0 ? 0 : i;
}
