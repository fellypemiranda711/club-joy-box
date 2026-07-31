import { createFileRoute } from "@tanstack/react-router";
import { AdminPage, Empty, Stat } from "@/components/admin/AdminShell";
import { useAdminGate, useAdminLabs, useAdminProfiles, useAdminQuotes, useAdminSubs } from "@/hooks/use-admin-data";
import { brl, commissionCents, isRevenueQuote, subStatusLabels } from "@/lib/admin";
import { isSubscriptionActive } from "@/lib/plan-catalog";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const { isAdmin } = useAdminGate();
  const subs = useAdminSubs(isAdmin);
  const quotes = useAdminQuotes(isAdmin);
  const labs = useAdminLabs(isAdmin);
  const profiles = useAdminProfiles(isAdmin);

  const all = subs.data ?? [];
  const active = all.filter((s) => isSubscriptionActive(s));
  const mrr = active.reduce((a, s) => a + s.monthly_price_cents, 0);
  const arr = mrr * 12;
  const overdue = all.filter((s) => ["past_due", "unpaid", "pending"].includes(s.status));
  const commissions = (quotes.data ?? [])
    .filter((q) => isRevenueQuote(q.status))
    .reduce((a, q) => a + commissionCents(q, labs.data ?? []), 0);

  const upcoming = [...active]
    .sort(
      (a, b) =>
        new Date(a.current_period_end ?? a.expires_at).getTime() -
        new Date(b.current_period_end ?? b.expires_at).getTime(),
    )
    .slice(0, 8);

  return (
    <AdminPage title="Financeiro" description="Receita recorrente, renovações e pendências de pagamento.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Receita mensal (MRR)" value={brl(mrr)} />
        <Stat label="Receita anual (ARR)" value={brl(arr)} />
        <Stat label="Comissões recebidas" value={brl(commissions)} />
        <Stat label="Pagamentos pendentes" value={String(overdue.length)} />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Próximas renovações</h2>
        <div className="mt-4 space-y-2 text-sm">
          {upcoming.map((s) => {
            const profile = profiles.data?.find((p) => p.id === s.user_id);
            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                <span>
                  {s.member_number} · {profile?.full_name || "Associado"} · {s.plan_name}
                </span>
                <span className="text-muted-foreground">
                  {new Date(s.current_period_end ?? s.expires_at).toLocaleDateString("pt-BR")} ·{" "}
                  {brl(s.monthly_price_cents * 12)}
                </span>
              </div>
            );
          })}
          {upcoming.length === 0 && <Empty>Nenhuma renovação programada.</Empty>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Cobranças pendentes</h2>
        <div className="mt-4 space-y-2 text-sm">
          {overdue.map((s) => {
            const profile = profiles.data?.find((p) => p.id === s.user_id);
            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                <span>
                  {profile?.full_name || "Associado"} · {s.plan_name}
                </span>
                <span className="text-muted-foreground">{subStatusLabels[s.status] ?? s.status}</span>
              </div>
            );
          })}
          {overdue.length === 0 && <Empty>Nenhuma pendência financeira. 🎉</Empty>}
        </div>
      </section>
    </AdminPage>
  );
}
