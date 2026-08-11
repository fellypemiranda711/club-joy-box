import { createFileRoute, Link, useHydrated } from "@tanstack/react-router";
import { MemberShell } from "@/components/member/MemberShell";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { planBySlug } from "@/lib/plan-catalog";

export const Route = createFileRoute("/_authenticated/assinar")({
  validateSearch: (search: Record<string, unknown>): { plano?: string | undefined } => ({
    plano: typeof search["plano"] === "string" ? search["plano"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Assinar plano | Vision Club" },
      {
        name: "description",
        content: "Finalize a assinatura anual do seu plano Vision Club em uma única cobrança.",
      },
      { property: "og:title", content: "Assinar plano | Vision Club" },
      {
        property: "og:description",
        content: "Checkout seguro para ativar sua assinatura anual do clube Vision Club.",
      },
    ],
  }),
  component: AssinarPage,
});

function AssinarPage() {
  const { plano } = Route.useSearch();
  const plan = planBySlug(plano);

  return (
    <>
      <PaymentTestModeBanner />
      <MemberShell>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Assinar plano</h1>

        {!plan ? (
          <div className="mt-6 rounded-2xl border border-border p-6 text-sm text-muted-foreground">
            Plano não encontrado.{" "}
            <Link to="/planos" className="text-primary underline-offset-4 hover:underline">
              Ver planos disponíveis
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-border p-6">
              <p className="font-display text-lg font-semibold">Plano {plan.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.priceLabel} · cobrança única de {plan.annualLabel}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.summary}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                Cobrança anual única no cartão, com renovação automática a cada 12 meses. Você
                pode cancelar quando quiser pela sua área do associado.
              </p>
            </div>
            <StripeEmbeddedCheckout
              priceId={plan.priceId}
              returnUrl={
                typeof window !== "undefined"
                  ? `${window.location.origin}/area?checkout=success&session_id={CHECKOUT_SESSION_ID}`
                  : "/area"
              }
            />
          </>
        )}
      </MemberShell>
    </>
  );
}
