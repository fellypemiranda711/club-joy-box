export function toE164Digits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Números brasileiros sem DDI recebem o 55 automaticamente
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 15) return null;
  return digits;
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function buildQuoteMessage(params: {
  memberName?: string | null;
  patientName: string;
  lensType?: string | null;
  amountCents: number;
}): string {
  const firstName = (params.memberName ?? "").trim().split(" ")[0];
  const greeting = firstName ? `Olá, ${firstName}!` : "Olá!";
  const lens = params.lensType ? ` (${params.lensType})` : "";
  return [
    `${greeting} Aqui é da equipe Vision Club. 👋`,
    "",
    `Preparamos o orçamento das lentes de ${params.patientName}${lens}.`,
    `Valor exclusivo de associado: ${formatBRL(params.amountCents)}.`,
    "",
    "O valor já inclui todos os tratamentos previstos no seu plano.",
    "Se estiver tudo certo, é só responder por aqui que seguimos com o pedido — e depois você faz a tirada de medidas por foto na sua área de associado.",
    "",
    "Qualquer dúvida, pode falar comigo por aqui. 😊",
  ].join("\n");
}

export function buildOptionsMessage(params: {
  memberName?: string | null;
  patientName: string;
  options: { tier: number; title: string; member_price_cents: number; market_price_cents: number }[];
}): string {
  const firstName = (params.memberName ?? "").trim().split(" ")[0];
  const greeting = firstName ? `Olá, ${firstName}!` : "Olá!";
  const lines = params.options
    .slice()
    .sort((a, b) => a.tier - b.tier)
    .map((o) =>
      [
        `${o.tier}) ${o.title}`,
        `Associado: ${formatBRL(o.member_price_cents)}`,
        `Média das óticas: ${formatBRL(o.market_price_cents)}`,
        `Economia: ${formatBRL(Math.max(o.market_price_cents - o.member_price_cents, 0))}`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    `${greeting} Aqui é da equipe Vision Club. 👋`,
    "",
    `Preparamos as opções de lentes para ${params.patientName}, da mais simples à mais completa em campo de visão:`,
    "",
    lines,
    "",
    "Você pode comparar e escolher a sua opção direto na sua área de associado, em Solicitações de orçamento.",
    "",
    "Qualquer dúvida, é só falar comigo por aqui. 😊",
  ].join("\n");
}

export function buildWhatsappUrl(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}


/** Converte um valor digitado em reais (ex: "1.290,50" ou "890") para centavos. */
export function parseBRLToCents(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const normalized = raw.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}
