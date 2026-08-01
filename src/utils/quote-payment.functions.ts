import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

type CheckoutResult = { clientSecret: string } | { error: string };
type ConfirmResult = { paid: boolean } | { error: string };

const UUID = /^[0-9a-fA-F-]{36}$/;

export const createQuotePaymentCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { quoteId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!UUID.test(data.quoteId)) throw new Error("Orçamento inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { supabase, userId } = context;

      const { data: quote } = await supabase
        .from("quote_requests")
        .select("id, patient_name, quoted_amount_cents, status, payment_status")
        .eq("id", data.quoteId)
        .maybeSingle();

      if (!quote) return { error: "Orçamento não encontrado." };
      if (quote.payment_status === "paid") return { error: "Este orçamento já foi pago." };
      if (!quote.quoted_amount_cents || quote.quoted_amount_cents < 50) {
        return { error: "Escolha uma opção de lente antes de pagar." };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const stripe = createStripeClient(data.environment);

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: { name: `Lentes Vision Club — ${quote.patient_name}` },
              unit_amount: quote.quoted_amount_cents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        payment_intent_data: { description: `Lentes Vision Club — ${quote.patient_name}` },
        ...(user?.email && { customer_email: user.email }),
        metadata: { userId, quoteId: quote.id, kind: "quote_payment" },
      });

      await supabase
        .from("quote_requests")
        .update({ stripe_session_id: session.id })
        .eq("id", quote.id);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const confirmQuotePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.sessionId)) throw new Error("Sessão inválida");
    return data;
  })
  .handler(async ({ data, context }): Promise<ConfirmResult> => {
    try {
      const { supabase, userId } = context;
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);

      const quoteId = session.metadata?.["quoteId"];
      if (!quoteId || session.metadata?.["userId"] !== userId) {
        return { error: "Pagamento não corresponde a este associado." };
      }
      if (session.payment_status !== "paid") return { paid: false };

      const { error } = await supabase
        .from("quote_requests")
        .update({ payment_status: "paid", paid_at: new Date().toISOString() })
        .eq("id", quoteId)
        .eq("user_id", userId);
      if (error) return { error: "Não foi possível registrar o pagamento." };

      return { paid: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
