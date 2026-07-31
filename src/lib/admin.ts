import { formatBRL } from "@/lib/whatsapp";

export const quoteStatusLabels: Record<string, string> = {
  received: "Recebida",
  quoting: "Em cotação",
  quoted: "Orçada",
  approved: "Aprovada",
  completed: "Concluída",
  canceled: "Cancelada",
};

export const subStatusLabels: Record<string, string> = {
  active: "Ativa",
  trialing: "Período de teste",
  past_due: "Pagamento pendente",
  pending: "Pendente",
  canceled: "Cancelada",
  unpaid: "Inadimplente",
};

export function brl(cents: number | null | undefined) {
  return formatBRL(cents ?? 0);
}

export function commissionCents(
  quote: { quoted_amount_cents: number | null; commission_cents: number | null; lab_id: string | null },
  labs: { id: string; commission_percent: number }[],
) {
  if (quote.commission_cents != null) return quote.commission_cents;
  const lab = labs.find((l) => l.id === quote.lab_id);
  if (!lab || !quote.quoted_amount_cents) return 0;
  return Math.round((quote.quoted_amount_cents * Number(lab.commission_percent)) / 100);
}

export function isRevenueQuote(status: string) {
  return status === "approved" || status === "completed";
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

/** Estágio de CRM derivado dos dados existentes do associado. */
export function crmStage(hasActiveSub: boolean, quoteCount: number): { label: string; tone: string } {
  if (hasActiveSub && quoteCount > 0) return { label: "Cliente ativo", tone: "bg-primary/10 text-primary" };
  if (hasActiveSub) return { label: "Onboarding", tone: "bg-secondary text-foreground" };
  if (quoteCount > 0) return { label: "Em negociação", tone: "bg-secondary text-foreground" };
  return { label: "Lead", tone: "bg-muted text-muted-foreground" };
}
