import { createFileRoute } from "@tanstack/react-router";
import { AdminPage, Empty, Stat } from "@/components/admin/AdminShell";
import { useAdminGate, useAdminProfiles, useAdminQuotes, useAdminSubs } from "@/hooks/use-admin-data";
import { brl, commissionCents, isRevenueQuote, monthKey, monthLabel } from "@/lib/admin";
import { useAdminLabs } from "@/hooks/use-admin-data";

export const Route = createFileRoute("/_authenticated/admin/relatorios")({
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { isAdmin } = useAdminGate();
  const subs = useAdminSubs(isAdmin);
  const quotes = useAdminQuotes(isAdmin);
  const profiles = useAdminProfiles(isAdmin);
  const labs = useAdminLabs(isAdmin);

  const months = Array.from(
    new Set([
      ...(subs.data ?? []).map((s) => monthKey(s.created_at)),
      ...(quotes.data ?? []).map((q) => monthKey(q.created_at)),
    ]),
  )
    .sort()
    .reverse()
    .slice(0, 12);

  const rows = months.map((m) => {
    const newSubs = (subs.data ?? []).filter((s) => monthKey(s.created_at) === m);
    const monthQuotes = (quotes.data ?? []).filter((q) => monthKey(q.created_at) === m);
    const closed = monthQuotes.filter((q) => isRevenueQuote(q.status));
    return {
      month: m,
      newSubs: newSubs.length,
      quotes: monthQuotes.length,
      closed: closed.length,
      volume: closed.reduce((a, q) => a + (q.quoted_amount_cents ?? 0), 0),
      commission: closed.reduce((a, q) => a + commissionCents(q, labs.data ?? []), 0),
    };
  });

  const planCounts = (subs.data ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.plan_name] = (acc[s.plan_name] ?? 0) + 1;
    return acc;
  }, {});

  const totalQuotes = quotes.data?.length ?? 0;
  const conversion = totalQuotes
    ? Math.round(((quotes.data ?? []).filter((q) => isRevenueQuote(q.status)).length / totalQuotes) * 100)
    : 0;

  return (
    <AdminPage title="Relatórios" description="Indicadores de crescimento, conversão e desempenho por período.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Cadastros" value={String(profiles.data?.length ?? 0)} />
        <Stat label="Pedidos" value={String(totalQuotes)} />
        <Stat label="Conversão de pedidos" value={`${conversion}%`} />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Desempenho por mês</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Mês</th>
                <th className="px-4 py-3">Novas assinaturas</th>
                <th className="px-4 py-3">Pedidos</th>
                <th className="px-4 py-3">Fechados</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-t border-border">
                  <td className="px-4 py-3">{monthLabel(r.month)}</td>
                  <td className="px-4 py-3">{r.newSubs}</td>
                  <td className="px-4 py-3">{r.quotes}</td>
                  <td className="px-4 py-3">{r.closed}</td>
                  <td className="px-4 py-3">{brl(r.volume)}</td>
                  <td className="px-4 py-3">{brl(r.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <div className="mt-4"><Empty>Ainda não há dados suficientes.</Empty></div>}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Distribuição por plano</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Object.entries(planCounts).map(([plan, count]) => (
            <div key={plan} className="rounded-xl border border-border p-4 text-sm">
              <p className="font-medium">{plan}</p>
              <p className="text-muted-foreground">{count} assinatura(s)</p>
            </div>
          ))}
          {Object.keys(planCounts).length === 0 && <Empty>Nenhuma assinatura registrada.</Empty>}
        </div>
      </section>
    </AdminPage>
  );
}
