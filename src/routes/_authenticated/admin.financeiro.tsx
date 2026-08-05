import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { AdminPage, Empty, Stat } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { useAdminGate, useAdminLabs, useAdminProfiles, useAdminQuotes, useAdminSubs } from "@/hooks/use-admin-data";
import { brl, commissionCents, isRevenueQuote, subStatusLabels } from "@/lib/admin";
import { isSubscriptionActive } from "@/lib/plan-catalog";
import { downloadCsv } from "@/lib/csv";

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

  const closedQuotes = (quotes.data ?? []).filter((q) => isRevenueQuote(q.status));
  const lensVolume = closedQuotes.reduce((a, q) => a + (q.quoted_amount_cents ?? 0), 0);
  const totalCommission = closedQuotes.reduce((a, q) => a + commissionCents(q, labs.data ?? []), 0);
  const ticketMedio = closedQuotes.length ? Math.round(lensVolume / closedQuotes.length) : 0;

  // Comissões por laboratório
  const labsWithStats = (labs.data ?? [])
    .map((lab) => {
      const labQuotes = closedQuotes.filter((q) => q.lab_id === lab.id);
      const volume = labQuotes.reduce((a, q) => a + (q.quoted_amount_cents ?? 0), 0);
      const commission = labQuotes.reduce((a, q) => a + commissionCents(q, labs.data ?? []), 0);
      return { ...lab, count: labQuotes.length, volume, commission };
    })
    .sort((a, b) => b.volume - a.volume);

  const upcoming = [...active]
    .sort(
      (a, b) =>
        new Date(a.current_period_end ?? a.expires_at).getTime() -
        new Date(b.current_period_end ?? b.expires_at).getTime(),
    )
    .slice(0, 8);

  const exportSubs = () => {
    downloadCsv("financeiro-assinaturas.csv", [
      ["Nº associado", "Nome", "Plano", "Status", "Mensal", "Anual", "Início", "Renovação"],
      ...all.map((s) => {
        const p = profiles.data?.find((pp) => pp.id === s.user_id);
        return [
          s.member_number,
          p?.full_name ?? "Associado",
          s.plan_name,
          subStatusLabels[s.status] ?? s.status,
          s.monthly_price_cents,
          s.monthly_price_cents * 12,
          new Date(s.started_at).toLocaleDateString("pt-BR"),
          new Date(s.current_period_end ?? s.expires_at).toLocaleDateString("pt-BR"),
        ];
      }),
    ]);
  };

  return (
    <AdminPage title="Financeiro" description="Receita recorrente, renovações e pendências de pagamento.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Receita mensal (MRR)" value={brl(mrr)} />
        <Stat label="Receita anual (ARR)" value={brl(arr)} />
        <Stat label="Ticket médio (lentes)" value={brl(ticketMedio)} />
        <Stat label="Comissões recebidas" value={brl(totalCommission)} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Volume em lentes" value={brl(lensVolume)} />
        <Stat label="Pedidos pagos" value={String(closedQuotes.length)} />
        <Stat label="Assinaturas ativas" value={String(active.length)} />
        <Stat label="Pagamentos pendentes" value={String(overdue.length)} />
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Comissões por laboratório</h2>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Laboratório</th>
                <th className="px-4 py-3">Pedidos</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">Comissão</th>
                <th className="px-4 py-3">% comissão</th>
              </tr>
            </thead>
            <tbody>
              {labsWithStats.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-3">{l.name}</td>
                  <td className="px-4 py-3">{l.count}</td>
                  <td className="px-4 py-3">{brl(l.volume)}</td>
                  <td className="px-4 py-3">{brl(l.commission)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{Number(l.commission_percent)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {labsWithStats.length === 0 && <div className="mt-4"><Empty>Nenhum laboratório com pedidos pagos.</Empty></div>}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Próximas renovações</h2>
          <Button size="sm" variant="outline" onClick={exportSubs} disabled={all.length === 0}>
            <Download className="mr-1.5 h-4 w-4" /> Exportar assinaturas (CSV)
          </Button>
        </div>
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
