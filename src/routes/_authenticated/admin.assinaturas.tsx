import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Empty, Stat } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { useAdminGate, useAdminProfiles, useAdminSubs } from "@/hooks/use-admin-data";
import { brl, subStatusLabels } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/assinaturas")({
  component: AssinaturasPage,
});

function AssinaturasPage() {
  const { isAdmin } = useAdminGate();
  const subs = useAdminSubs(isAdmin);
  const profiles = useAdminProfiles(isAdmin);
  const queryClient = useQueryClient();

  const setStatus = useMutation({
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

  const all = subs.data ?? [];
  const active = all.filter((s) => s.status === "active");
  const canceled = all.filter((s) => s.status === "canceled");
  const churn = all.length ? Math.round((canceled.length / all.length) * 100) : 0;

  return (
    <AdminPage title="Assinaturas" description="Controle de planos, renovações e status de cobrança.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Ativas" value={String(active.length)} />
        <Stat label="Canceladas" value={String(canceled.length)} />
        <Stat label="Taxa de cancelamento" value={`${churn}%`} />
      </div>

      <div className="mt-6 space-y-3">
        {all.map((s) => {
          const profile = profiles.data?.find((p) => p.id === s.user_id);
          return (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm"
            >
              <div>
                <p className="font-medium">
                  {s.member_number} · {s.plan_name}
                </p>
                <p className="text-muted-foreground">
                  {profile?.full_name || "Associado"} · {subStatusLabels[s.status] ?? s.status} ·{" "}
                  {brl(s.monthly_price_cents)}/mês
                </p>
                <p className="text-muted-foreground">
                  Início {new Date(s.started_at).toLocaleDateString("pt-BR")} · Renovação{" "}
                  {new Date(s.current_period_end ?? s.expires_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: s.id, status: "active" })}>
                  Ativar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: s.id, status: "canceled" })}>
                  Cancelar
                </Button>
              </div>
            </div>
          );
        })}
        {all.length === 0 && <Empty>Nenhuma assinatura ainda.</Empty>}
      </div>
    </AdminPage>
  );
}
