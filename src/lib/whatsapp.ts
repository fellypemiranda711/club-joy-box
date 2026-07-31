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

export function buildWhatsappUrl(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}
