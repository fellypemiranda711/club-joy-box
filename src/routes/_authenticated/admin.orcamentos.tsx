import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Empty } from "@/components/admin/AdminShell";
import { QuoteOptionsEditor } from "@/components/admin/QuoteOptionsEditor";
import { QuoteChat } from "@/components/chat/QuoteChat";

import { Button } from "@/components/ui/button";
import {
  useAdminGate,
  useAdminLabs,
  useAdminLensProducts,
  useAdminProfiles,
  useAdminQuotes,
} from "@/hooks/use-admin-data";
import { brl, quoteStatusLabels } from "@/lib/admin";
import { buildQuoteMessage, buildWhatsappUrl, parseBRLToCents, toE164Digits } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin/orcamentos")({
  component: OrcamentosPage,
});

const PENDING_STATUSES = ["received", "quoting", "quoted"];

function OrcamentosPage() {
  const { isAdmin } = useAdminGate();
  const quotes = useAdminQuotes(isAdmin);
  const profiles = useAdminProfiles(isAdmin);
  const labs = useAdminLabs(isAdmin);
  const lensProducts = useAdminLensProducts(isAdmin);
  const queryClient = useQueryClient();
  const [lensByQuote, setLensByQuote] = useState<Record<string, string>>({});

  const setQuoteStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("quote_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação atualizada.");
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
    },
    onError: () => toast.error("Não foi possível atualizar a solicitação."),
  });

  const setLab = useMutation({
    mutationFn: async ({ id, labId }: { id: string; labId: string }) => {
      const { error } = await supabase.from("quote_requests").update({ lab_id: labId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Laboratório vinculado.");
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
    },
    onError: () => toast.error("Não foi possível vincular o laboratório."),
  });

  const sendQuote = useMutation({
    mutationFn: async ({ id, amountCents, labId }: { id: string; amountCents: number; labId: string | null }) => {
      const lab = labs.data?.find((l) => l.id === labId);
      const commission = lab ? Math.round((amountCents * Number(lab.commission_percent)) / 100) : null;
      const { error } = await supabase
        .from("quote_requests")
        .update({ status: "quoted", quoted_amount_cents: amountCents, commission_cents: commission })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orçamento registrado — abrindo o WhatsApp do associado.");
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
    },
    onError: () => toast.error("Não foi possível enviar o orçamento."),
  });

  async function openPrescription(path: string | null) {
    if (!path) return;
    const { data, error } = await supabase.storage.from("prescriptions").createSignedUrl(path, 300);
    if (error || !data) {
      toast.error("Não foi possível abrir a receita.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const pending = (quotes.data ?? []).filter((q) => PENDING_STATUSES.includes(q.status));

  return (
    <AdminPage
      title="Orçamentos"
      description="Solicitações que ainda precisam ser cotadas e enviadas ao associado."
    >
      <section className="space-y-3">
        {pending.map((q) => {
          const profile = profiles.data?.find((p) => p.id === q.user_id);
          const phoneDigits = toE164Digits(profile?.phone);
          const lab = labs.data?.find((l) => l.id === q.lab_id);
          const labProducts = (lensProducts.data ?? []).filter(
            (p) => p.active && (!q.lab_id || p.lab_id === q.lab_id),
          );
          const selectedLens = labProducts.find((p) => p.id === lensByQuote[q.id]);
          return (
            <div key={q.id} className="rounded-xl border border-border p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{q.patient_name}</p>
                  <p className="text-muted-foreground">
                    {q.lens_type || "—"} · {quoteStatusLabels[q.status] ?? q.status} ·{" "}
                    {new Date(q.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-muted-foreground">
                    {profile?.full_name || "Associado"} · {profile?.phone || "sem WhatsApp cadastrado"}
                  </p>
                  <p className="text-muted-foreground">
                    Laboratório: {lab?.name ?? "não definido"}
                    {q.quoted_amount_cents ? ` · Valor enviado ${brl(q.quoted_amount_cents)}` : ""}
                  </p>
                  {q.treatments.length > 0 && (
                    <p className="text-muted-foreground">Tratamentos: {q.treatments.join(", ")}</p>
                  )}
                  {q.notes && <p className="text-muted-foreground">Observações: {q.notes}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <select
                    className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                    value={q.lab_id ?? ""}
                    onChange={(e) => setLab.mutate({ id: q.id, labId: e.target.value })}
                  >
                    <option value="">Vincular laboratório</option>
                    {labs.data?.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                    value={lensByQuote[q.id] ?? ""}
                    onChange={(e) => setLensByQuote((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  >
                    <option value="">Escolher lente da tabela</option>
                    {labProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.refraction_index ? ` ${p.refraction_index}` : ""} — {brl(p.price_cents)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedLens && (
                <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                  {selectedLens.name}
                  {selectedLens.lens_type ? ` · ${selectedLens.lens_type}` : ""} · associado{" "}
                  {brl(selectedLens.price_cents)} · custo {brl(selectedLens.cost_cents)} · margem{" "}
                  {brl(selectedLens.price_cents - selectedLens.cost_cents)}
                  {selectedLens.treatments.length > 0 && ` · ${selectedLens.treatments.join(", ")}`}
                </p>
              )}

              <QuoteOptionsEditor
                quoteId={q.id}
                labId={q.lab_id}
                patientName={q.patient_name}
                memberName={profile?.full_name ?? null}
                phoneDigits={phoneDigits}
                lensProducts={lensProducts.data ?? []}
              />


              <div className="mt-3 flex flex-wrap gap-2">
                {q.prescription_path && (
                  <Button size="sm" variant="outline" onClick={() => openPrescription(q.prescription_path)}>
                    Ver receita
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setQuoteStatus.mutate({ id: q.id, status: "quoting" })}>
                  Em cotação
                </Button>
                <Button
                  size="sm"
                  disabled={!phoneDigits || sendQuote.isPending}
                  onClick={async () => {
                    if (!phoneDigits) {
                      toast.error("Este associado não tem WhatsApp cadastrado.");
                      return;
                    }
                    let cents = selectedLens?.price_cents ?? null;
                    if (!cents) {
                      const raw = window.prompt("Valor do orçamento em reais (ex: 890,00)");
                      if (!raw) return;
                      cents = parseBRLToCents(raw);
                    }
                    if (!cents || cents <= 0) {
                      toast.error("Valor inválido.");
                      return;
                    }
                    const labId = q.lab_id ?? selectedLens?.lab_id ?? null;
                    const url = buildWhatsappUrl(
                      phoneDigits,
                      buildQuoteMessage({
                        memberName: profile?.full_name ?? null,
                        patientName: q.patient_name,
                        lensType: selectedLens ? selectedLens.name : q.lens_type,
                        amountCents: cents,
                      }),
                    );
                    const win = window.open(url, "_blank", "noopener,noreferrer");
                    try {
                      await sendQuote.mutateAsync({ id: q.id, amountCents: cents, labId });
                    } catch {
                      win?.close();
                    }
                  }}
                >
                  {selectedLens ? `Enviar ${brl(selectedLens.price_cents)} por WhatsApp` : "Enviar orçamento por WhatsApp"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setQuoteStatus.mutate({ id: q.id, status: "canceled" })}>
                  Cancelar
                </Button>
              </div>
            </div>
          );
        })}
        {pending.length === 0 && <Empty>Nenhum orçamento pendente no momento.</Empty>}
      </section>
    </AdminPage>
  );
}
