import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Empty } from "@/components/admin/AdminShell";
import { OrderTrackingEditor } from "@/components/admin/OrderTrackingEditor";
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

  const paidQuotes = (quotes.data ?? []).filter((q) => q.status === "approved" || q.status === "completed");

  return (
    <AdminPage
      title="Pedidos"
      description="Somente pedidos aprovados e pagos pelo associado, com a lente escolhida e as medidas conferidas."
    >
      <section className="space-y-3">
        {paidQuotes.map((q) => {
          const profile = profiles.data?.find((p) => p.id === q.user_id);
          const phoneDigits = toE164Digits(profile?.phone);
          const lab = labs.data?.find((l) => l.id === q.lab_id);
          const labProducts = (lensProducts.data ?? []).filter(
            (p) => p.active && (!q.lab_id || p.lab_id === q.lab_id),
          );
          const selectedLens = labProducts.find((p) => p.id === lensByQuote[q.id]);
          const quoteMeasurements = (measurements.data ?? []).filter((m) => m.quote_id === q.id);

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

              <div className="mt-3 grid gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground sm:grid-cols-2">
                <p>Tipo de lente: {selectedLens?.name ?? q.lens_type ?? "—"}</p>
                <p>
                  Tratamentos:{" "}
                  {(selectedLens?.treatments?.length ? selectedLens.treatments : q.treatments).join(", ") || "—"}
                </p>
                <p>Valor ao associado: {brl(selectedLens?.price_cents ?? q.quoted_amount_cents)}</p>
                <p>
                  Custo/margem:{" "}
                  {selectedLens
                    ? `${brl(selectedLens.cost_cents)} · ${brl(selectedLens.price_cents - selectedLens.cost_cents)}`
                    : "—"}
                </p>
                {q.notes && <p className="sm:col-span-2">Observações: {q.notes}</p>}
              </div>

              <div className="mt-3 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Medidas</p>
                {quoteMeasurements.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma medida enviada por foto ainda.</p>
                )}
                {quoteMeasurements.map((m) => (
                  <div key={m.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Enviadas em {new Date(m.created_at).toLocaleDateString("pt-BR")}
                      </p>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                        {measurementStatusLabels[m.status] ?? m.status}
                      </span>
                    </div>
                    {m.pd_mm != null ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        DP {m.pd_mm} mm · DNP {m.dnp_right_mm}/{m.dnp_left_mm} mm · Altura {m.height_right_mm}/
                        {m.height_left_mm} mm
                        {m.pantoscopic_angle_deg != null && ` · Pantoscópico ${m.pantoscopic_angle_deg}°`}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Medidas ainda não enviadas por foto.
                      </p>
                    )}
                    {m.admin_notes && <p className="mt-1 text-xs text-muted-foreground">Nota: {m.admin_notes}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.frame_photo_path && (
                        <Button size="sm" variant="outline" onClick={() => openPhoto(m.frame_photo_path)}>
                          Ver armação no rosto
                        </Button>
                      )}
                      {m.front_photo_path && (
                        <Button size="sm" variant="outline" onClick={() => openPhoto(m.front_photo_path)}>
                          Ver foto frontal
                        </Button>
                      )}
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
              </div>

              <OrderTrackingEditor
                quoteId={q.id}
                status={q.fulfillment_status}
                trackingCode={q.tracking_code}
                carrier={q.carrier}
                estimatedDelivery={q.estimated_delivery}
                adminId={user?.id}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!phoneDigits || sendQuote.isPending}
                  onClick={async () => {
                    if (!phoneDigits) {
                      toast.error("Este associado não tem WhatsApp cadastrado.");
                      return;
                    }
                    let cents = selectedLens?.price_cents ?? q.quoted_amount_cents ?? null;
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
                  Falar no WhatsApp
                </Button>
                {q.status !== "completed" && (
                  <Button size="sm" onClick={() => setQuoteStatus.mutate({ id: q.id, status: "completed" })}>
                    Concluir
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {paidQuotes.length === 0 && <Empty>Nenhum pedido aprovado e pago ainda.</Empty>}
      </section>

    </AdminPage>
  );
}
