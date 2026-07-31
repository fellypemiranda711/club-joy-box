import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell } from "@/components/member/MemberShell";
import { useIsAdmin, useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";

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
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setQuoteStatus.mutate({ id: q.id, status: "quoting" })}>
                  Em cotação
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
