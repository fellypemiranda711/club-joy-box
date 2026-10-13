import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, FileText, Loader2, Plus } from "lucide-react";
import { MemberShell } from "@/components/member/MemberShell";
import { QuoteOptionsPicker } from "@/components/member/QuoteOptionsPicker";
import { QuotePaymentPanel } from "@/components/member/QuotePaymentPanel";
import { confirmQuotePayment } from "@/utils/quote-payment.functions";
import { FramePhotoPanel } from "@/components/member/FramePhotoPanel";
import { MeasurementDialog } from "@/components/member/MeasurementDialog";
import { getStripeEnvironment } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/solicitacoes")({
  head: () => ({
    meta: [
      { title: "Solicitações | Vision Club" },
      {
        name: "description",
        content:
          "Acompanhe suas solicitações de orçamento: opções de lente, pagamento, foto da armação e medidas.",
      },
      { property: "og:title", content: "Solicitações | Vision Club" },
      {
        property: "og:description",
        content:
          "Acompanhe suas solicitações de orçamento: opções de lente, pagamento, foto da armação e medidas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SolicitacoesPage,
});

const STATUS_LABELS: Record<string, string> = {
  pending: "Em análise",
  received: "Em análise",
  quoting: "Em cotação",
  quoted: "Orçamento enviado",
  approved: "Aprovado",
  paid: "Pago",
  completed: "Concluído",
  canceled: "Cancelado",
  cancelled: "Cancelado",
};

const CAN_CHOOSE_STATUSES = ["received", "quoting", "quoted"];

function SolicitacoesPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ["my-quote-requests", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select(
          "id, os_number, patient_name, lens_type, status, payment_status, quoted_amount_cents, created_at",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Volta do checkout do Stripe: confirma o pagamento e atualiza a lista.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("quote_session");
    if (!sessionId || sessionId.includes("{")) return;
    window.history.replaceState({}, "", window.location.pathname);
    (async () => {
      const result = await confirmQuotePayment({
        data: { sessionId, environment: getStripeEnvironment() },
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      if (result.paid) {
        toast.success("Pagamento confirmado! Agora você pode enviar as medidas por foto.");
        queryClient.invalidateQueries({ queryKey: ["my-quote-requests", user?.id] });
      }
    })();
  }, [queryClient, user?.id]);

  return (
    <MemberShell>
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Suas solicitações
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Acompanhe cada etapa: opções de lente, pagamento, foto com a armação no rosto e
              medidas.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/orcamentos">
              <Plus className="h-4 w-4" /> Fazer nova solicitação
            </Link>
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {requestsQuery.isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : (requestsQuery.data?.length ?? 0) === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Você ainda não fez nenhuma solicitação.
            </p>
          ) : (
            requestsQuery.data!.map((req) => (
              <div
                key={req.id}
                className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="mb-1 inline-block rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                      {(req as { os_number?: string | null }).os_number ?? "OS —"}
                    </span>
                    <p className="text-sm font-medium">{req.patient_name}</p>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                    <Clock className="h-3 w-3" />
                    {STATUS_LABELS[req.status] ?? req.status}
                  </span>
                </div>
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  {req.lens_type ?? "Tipo de lente a definir"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(req.created_at).toLocaleDateString("pt-BR")}
                </p>
                <QuoteOptionsPicker
                  quoteId={req.id}
                  userId={user?.id}
                  canChoose={CAN_CHOOSE_STATUSES.includes(req.status)}
                />
                {req.status === "approved" && req.payment_status !== "paid" && (
                  <QuotePaymentPanel quoteId={req.id} amountCents={req.quoted_amount_cents} />
                )}
                {req.payment_status === "paid" && user && (
                  <>
                    <p className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                      Pagamento confirmado. Envie a foto com a armação no rosto e faça a tomada de
                      medidas.
                    </p>
                    <FramePhotoPanel quoteId={req.id} userId={user.id} />
                    <div className="mt-3">
                      <MeasurementDialog
                        quoteId={req.id}
                        userId={user.id}
                        patientName={req.patient_name}
                      />
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </MemberShell>
  );
}
