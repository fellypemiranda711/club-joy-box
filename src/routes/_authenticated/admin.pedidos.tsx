import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Empty } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import {
  useAdminGate,
  useAdminLabs,
  useAdminLensProducts,
  useAdminMeasurements,
  useAdminProfiles,
  useAdminQuotes,
} from "@/hooks/use-admin-data";
import { brl, quoteStatusLabels } from "@/lib/admin";
import { measurementStatusLabels } from "@/lib/measurements";
import { buildQuoteMessage, buildWhatsappUrl, parseBRLToCents, toE164Digits } from "@/lib/whatsapp";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: PedidosPage,
});

function PedidosPage() {
  const { user } = useSession();
  const { isAdmin } = useAdminGate();
  const quotes = useAdminQuotes(isAdmin);
  const profiles = useAdminProfiles(isAdmin);
  const labs = useAdminLabs(isAdmin);
  const lensProducts = useAdminLensProducts(isAdmin);
  const measurements = useAdminMeasurements(isAdmin);
  const queryClient = useQueryClient();
  const [lensByQuote, setLensByQuote] = useState<Record<string, string>>({});

  const setQuoteStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("quote_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
    },
    onError: () => toast.error("Não foi possível atualizar o pedido."),
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

  const reviewMeasurement = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string | undefined }) => {
      const { error } = await supabase
        .from("quote_measurements")
        .update({
          status,
          admin_notes: notes ?? null,
          validated_by: user?.id ?? null,
          validated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Medidas atualizadas.");
      queryClient.invalidateQueries({ queryKey: ["admin-measurements"] });
    },
    onError: () => toast.error("Não foi possível atualizar as medidas."),
  });

  async function openPhoto(path: string | null) {
    if (!path) return;
    const { data, error } = await supabase.storage.from("measurements").createSignedUrl(path, 300);
    if (error || !data) {
      toast.error("Não foi possível abrir a foto.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <AdminPage title="Pedidos" description="Solicitações de orçamento e conferência das medidas enviadas por foto.">
      <section className="space-y-3">
        {quotes.data?.map((q) => {
          const profile = profiles.data?.find((p) => p.id === q.user_id);
          const phoneDigits = toE164Digits(profile?.phone);
          const lab = labs.data?.find((l) => l.id === q.lab_id);
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
                    {q.quoted_amount_cents ? ` · Valor ${brl(q.quoted_amount_cents)}` : ""}
                  </p>
                </div>
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
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setQuoteStatus.mutate({ id: q.id, status: "quoting" })}>
                  Em cotação
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!phoneDigits || sendQuote.isPending}
                  onClick={async () => {
                    if (!phoneDigits) {
                      toast.error("Este associado não tem WhatsApp cadastrado.");
                      return;
                    }
                    const raw = window.prompt("Valor do orçamento em reais (ex: 890,00)");
                    if (!raw) return;
                    const cents = Math.round(Number(raw.replace(/\./g, "").replace(",", ".")) * 100);
                    if (!Number.isFinite(cents) || cents <= 0) {
                      toast.error("Valor inválido.");
                      return;
                    }
                    const url = buildWhatsappUrl(
                      phoneDigits,
                      buildQuoteMessage({
                        memberName: profile?.full_name ?? null,
                        patientName: q.patient_name,
                        lensType: q.lens_type,
                        amountCents: cents,
                      }),
                    );
                    const win = window.open(url, "_blank", "noopener,noreferrer");
                    try {
                      await sendQuote.mutateAsync({ id: q.id, amountCents: cents, labId: q.lab_id });
                    } catch {
                      win?.close();
                    }
                  }}
                >
                  Enviar orçamento por WhatsApp
                </Button>
                <Button size="sm" variant="outline" onClick={() => setQuoteStatus.mutate({ id: q.id, status: "completed" })}>
                  Concluir
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setQuoteStatus.mutate({ id: q.id, status: "canceled" })}>
                  Cancelar
                </Button>
              </div>
            </div>
          );
        })}
        {quotes.data?.length === 0 && <Empty>Nenhum pedido ainda.</Empty>}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Medidas enviadas por foto</h2>
        <div className="mt-4 space-y-3">
          {measurements.data?.map((m) => (
            <div key={m.id} className="rounded-xl border border-border p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{m.quote_requests?.patient_name ?? "Associado"}</p>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                  {measurementStatusLabels[m.status] ?? m.status}
                </span>
              </div>
              <p className="mt-2 text-muted-foreground">
                DP {m.pd_mm} mm · DNP {m.dnp_right_mm}/{m.dnp_left_mm} mm · Altura {m.height_right_mm}/
                {m.height_left_mm} mm
                {m.pantoscopic_angle_deg != null && ` · Pantoscópico ${m.pantoscopic_angle_deg}°`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openPhoto(m.front_photo_path)}>
                  Ver foto frontal
                </Button>
                {m.profile_photo_path && (
                  <Button size="sm" variant="outline" onClick={() => openPhoto(m.profile_photo_path)}>
                    Ver foto de perfil
                  </Button>
                )}
                <Button size="sm" onClick={() => reviewMeasurement.mutate({ id: m.id, status: "validated" })}>
                  Conferir e aprovar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const notes = window.prompt("O que precisa ser refeito?") ?? undefined;
                    reviewMeasurement.mutate({ id: m.id, status: "rejected", notes });
                  }}
                >
                  Pedir para refazer
                </Button>
              </div>
            </div>
          ))}
          {measurements.data?.length === 0 && <Empty>Nenhuma medida enviada ainda.</Empty>}
        </div>
      </section>
    </AdminPage>
  );
}
