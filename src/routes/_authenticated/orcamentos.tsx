import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, FileText, Loader2 } from "lucide-react";
import { MemberShell } from "@/components/member/MemberShell";
import {
  QuoteRequestWizard,
  type QuoteWizardResult,
} from "@/components/member/QuoteRequestWizard";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos | Vision Club" },
      {
        name: "description",
        content: "Solicite orçamentos de lentes com o assistente Vision Club.",
      },
      { property: "og:title", content: "Orçamentos | Vision Club" },
      { property: "og:description", content: "Solicite orçamentos de lentes com o assistente Vision Club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrcamentosPage,
});

const STATUS_LABELS: Record<string, string> = {
  pending: "Em análise",
  quoted: "Orçamento enviado",
  approved: "Aprovado",
  paid: "Pago",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function OrcamentosPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [wizardKey, setWizardKey] = useState(0);

  const requestsQuery = useQuery({
    queryKey: ["my-quote-requests", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("id, patient_name, lens_type, status, payment_status, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (result: QuoteWizardResult) => {
      if (!user) throw new Error("Sessão expirada. Entre novamente.");

      const { data: hasActive, error: subError } = await supabase.rpc(
        "has_any_active_subscription",
        { user_uuid: user.id },
      );
      if (subError) throw subError;
      if (!hasActive) {
        throw new Error("É preciso ter uma assinatura ativa para solicitar orçamentos.");
      }

      let prescriptionPath: string | null = null;
      if (result.file) {
        const ext = result.file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("prescriptions")
          .upload(path, result.file, { contentType: result.file.type });
        if (uploadError) throw uploadError;
        prescriptionPath = path;
      }

      const notes = [
        `Armação: ${result.has_frame === "sim" ? "já possui" : "precisa de uma"}`,
        result.notes ? `Observações: ${result.notes}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const { error: insertError } = await supabase.from("quote_requests").insert({
        user_id: user.id,
        patient_name: result.patient_name,
        lens_type: result.lens_type || null,
        notes,
        prescription_path: prescriptionPath,
        status: "pending",
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada! Nossa equipe vai analisar e te retornar.");
      queryClient.invalidateQueries({ queryKey: ["my-quote-requests"] });
      setWizardKey((k) => k + 1);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar. Tente novamente.");
    },
  });

  return (
    <MemberShell>
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Novo orçamento</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Responda algumas perguntas e nossa equipe prepara sua cotação com os laboratórios parceiros.
          </p>
          <div className="mt-6">
            <QuoteRequestWizard
              key={wizardKey}
              isPending={submitMutation.isPending}
              onSubmit={(result) => submitMutation.mutate(result)}
            />
          </div>
        </div>

        <aside>
          <h2 className="font-display text-xl font-semibold tracking-tight">Suas solicitações</h2>
          <div className="mt-4 space-y-3">
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
                    <p className="text-sm font-medium">{req.patient_name}</p>
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
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </MemberShell>
  );
}
