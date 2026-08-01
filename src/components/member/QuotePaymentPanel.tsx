import { useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createQuotePaymentCheckout } from "@/utils/quote-payment.functions";
import { formatBRL } from "@/lib/whatsapp";

export function QuotePaymentPanel({
  quoteId,
  amountCents,
}: {
  quoteId: string;
  amountCents: number | null;
}) {
  const [open, setOpen] = useState(false);

  const fetchClientSecret = async (): Promise<string> => {
    const returnUrl = `${window.location.origin}/orcamentos?quote_session={CHECKOUT_SESSION_ID}`;
    const result = await createQuotePaymentCheckout({
      data: { quoteId, returnUrl, environment: getStripeEnvironment() },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Não foi possível iniciar o pagamento.");
    return result.clientSecret;
  };

  return (
    <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="font-medium">Pagamento das lentes</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Lente escolhida{amountCents ? ` — ${formatBRL(amountCents)}` : ""}. Após a confirmação do
        pagamento, liberamos a tomada de medidas por foto.
      </p>
      {!open ? (
        <Button className="mt-3" size="sm" onClick={() => setOpen(true)}>
          Pagar agora
        </Button>
      ) : (
        <div id="checkout" className="mt-4">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}
    </div>
  );
}
