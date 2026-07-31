import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell } from "@/components/member/MemberShell";
import { useIsAdmin, useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { measurementStatusLabels } from "@/lib/measurements";
import { buildQuoteMessage, buildWhatsappUrl, toE164Digits } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel administrativo | Vision Club" },
      { name: "description", content: "Gestão de associados, assinaturas e solicitações do Vision Club." },
      { property: "og:title", content: "Painel administrativo | Vision Club" },
      { property: "og:description", content: "Gestão interna do clube de assinatura Vision Club." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useSession();
  const { data: isAdmin, isLoading } = useIsAdmin(user?.id);
  const queryClient = useQueryClient();

  const subs = useQuery({
    queryKey: ["admin-subs"],
    enabled: Boolean(isAdmin),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const quotes = useQuery({
    queryKey: ["admin-quotes"],
    enabled: Boolean(isAdmin),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const profiles = useQuery({
    queryKey: ["admin-profiles"],
    enabled: Boolean(isAdmin),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, phone");
      if (error) throw error;
      return data ?? [];
    },
  });

  const measurements = useQuery({
    queryKey: ["admin-measurements"],
    enabled: Boolean(isAdmin),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_measurements")
        .select("*, quote_requests(patient_name, lens_type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });


  const labs = useQuery({
    queryKey: ["admin-labs"],
    enabled: Boolean(isAdmin),
    queryFn: async () => {
      const { data, error } = await supabase.from("labs").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const setSubStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("subscriptions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assinatura atualizada.");
      queryClient.invalidateQueries({ queryKey: ["admin-subs"] });
    },
    onError: () => toast.error("Não foi possível atualizar a assinatura."),
  });

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

  const sendQuote = useMutation({
    mutationFn: async ({ id, amountCents }: { id: string; amountCents: number }) => {
      const { error } = await supabase
        .from("quote_requests")
        .update({ status: "quoted", quoted_amount_cents: amountCents })
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



  if (isLoading) {
    return (
      <MemberShell>
        <p className="text-sm text-muted-foreground">Verificando permissões...</p>
      </MemberShell>
    );
  }

  if (!isAdmin) {
    return (
      <MemberShell>
        <h1 className="font-display text-2xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é exclusiva da equipe administrativa do Vision Club.
        </p>
      </MemberShell>
    );
  }

  const activeCount = subs.data?.filter((s) => s.status === "active").length ?? 0;
  const mrr =
    subs.data
      ?.filter((s) => s.status === "active")
      .reduce((acc, s) => acc + s.monthly_price_cents, 0) ?? 0;

  return (
    <MemberShell>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Painel administrativo</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Assinaturas" value={String(subs.data?.length ?? 0)} />
        <Stat label="Ativas" value={String(activeCount)} />
        <Stat label="Receita mensal" value={`R$ ${(mrr / 100).toFixed(2).replace(".", ",")}`} />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Assinaturas</h2>
        <div className="mt-4 space-y-3">
          {subs.data?.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm">
              <div>
                <p className="font-medium">{s.member_number} · {s.plan_name}</p>
                <p className="text-muted-foreground">
                  {s.status} · início {new Date(s.started_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSubStatus.mutate({ id: s.id, status: "active" })}>
                  Ativar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSubStatus.mutate({ id: s.id, status: "canceled" })}>
                  Cancelar
                </Button>
              </div>
            </div>
          ))}
          {subs.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma assinatura ainda.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Solicitações de orçamento</h2>
        <div className="mt-4 space-y-3">
          {quotes.data?.map((q) => (
            <div key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm">
              <div>
                <p className="font-medium">{q.patient_name}</p>
                <p className="text-muted-foreground">
                  {q.lens_type || "—"} · {q.status} · {new Date(q.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setQuoteStatus.mutate({ id: q.id, status: "quoting" })}>
                  Em cotação
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const raw = window.prompt("Valor do orçamento em reais (ex: 890,00)");
                    if (!raw) return;
                    const cents = Math.round(Number(raw.replace(/\./g, "").replace(",", ".")) * 100);
                    if (!Number.isFinite(cents) || cents <= 0) {
                      toast.error("Valor inválido.");
                      return;
                    }
                    sendQuote.mutate({ id: q.id, amountCents: cents });
                  }}
                >
                  Enviar orçamento
                </Button>
                <Button size="sm" variant="outline" onClick={() => setQuoteStatus.mutate({ id: q.id, status: "completed" })}>
                  Concluir
                </Button>
              </div>
            </div>
          ))}
          {quotes.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma solicitação ainda.</p>}
        </div>
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
                DP {m.pd_mm} mm · DNP {m.dnp_right_mm}/{m.dnp_left_mm} mm · Altura{" "}
                {m.height_right_mm}/{m.height_left_mm} mm
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
                <Button
                  size="sm"
                  onClick={() => reviewMeasurement.mutate({ id: m.id, status: "validated" })}
                >
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
          {measurements.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma medida enviada ainda.</p>
          )}
        </div>
      </section>



      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Laboratórios parceiros</h2>
        <div className="mt-4 space-y-3">
          {labs.data?.map((l) => (
            <div key={l.id} className="rounded-xl border border-border p-4 text-sm">
              <p className="font-medium">{l.name}</p>
              <p className="text-muted-foreground">
                {l.contact_email || "sem e-mail"} · comissão {l.commission_percent}%
              </p>
            </div>
          ))}
          {labs.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum laboratório cadastrado.</p>}
        </div>
      </section>
    </MemberShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
