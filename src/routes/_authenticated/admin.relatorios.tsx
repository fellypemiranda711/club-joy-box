import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { AdminPage, Empty, Stat } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { useAdminGate, useAdminProfiles, useAdminQuotes, useAdminSubs } from "@/hooks/use-admin-data";
import { useAdminLabs } from "@/hooks/use-admin-data";
import { brl, commissionCents, isRevenueQuote, monthKey, monthLabel } from "@/lib/admin";
import { downloadCsv } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/admin/relatorios")({
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { isAdmin } = useAdminGate();
  const subs = useAdminSubs(isAdmin);
  const quotes = useAdminQuotes(isAdmin);
  const profiles = useAdminProfiles(isAdmin);
  const labs = useAdminLabs(isAdmin);

  const closedQuotes = (quotes.data ?? []).filter((q) => isRevenueQuote(q.status));
  const totalVolume = closedQuotes.reduce((a, q) => a + (q.quoted_amount_cents ?? 0), 0);
  const ticketMedio = closedQuotes.length ? Math.round(totalVolume / closedQuotes.length) : 0;
  const totalQuotes = quotes.data?.length ?? 0;
  const conversion = totalQuotes
    ? Math.round((closedQuotes.length / totalQuotes) * 100)
    : 0;

  // Comissões por laboratório
  const labsWithStats = (labs.data ?? []).map((lab) => {
    const labQuotes = closedQuotes.filter((q) => q.lab_id === lab.id);
    const volume = labQuotes.reduce((a, q) => a + (q.quoted_amount_cents ?? 0), 0);
    const commission = labQuotes.reduce((a, q) => a + commissionCents(q, labs.data ?? []), 0);
    return { ...lab, count: labQuotes.length, volume, commission };
  });
  const quotesSemLab = closedQuotes.filter((q) => !q.lab_id);
  const labsWithStatsSorted = [...labsWithStats].sort((a, b) => b.volume - a.volume);

  // Desempenho por mês
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
    const volume = closed.reduce((a, q) => a + (q.quoted_amount_cents ?? 0), 0);
    const commission = closed.reduce((a, q) => a + commissionCents(q, labs.data ?? []), 0);
    return {
      month: m,
      newSubs: newSubs.length,
      quotes: monthQuotes.length,
      closed: closed.length,
      volume,
      ticket: closed.length ? Math.round(volume / closed.length) : 0,
      commission,
    };
  });

  const planCounts = (subs.data ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.plan_name] = (acc[s.plan_name] ?? 0) + 1;
    return acc;
  }, {});

  const exportMonthly = () => {
    downloadCsv("relatorio-mensal.csv", [
      ["Mês", "Novas assinaturas", "Pedidos", "Fechados", "Ticket médio", "Volume", "Comissão"],
      ...rows.map((r) => [monthLabel(r.month), r.newSubs, r.quotes, r.closed, r.ticket, r.volume, r.commission]),
    ]);
  };

  const exportLabs = () => {
    downloadCsv("relatorio-laboratorios.csv", [
      ["Laboratório", "Pedidos", "Volume", "Comissão"],
      ...labsWithStatsSorted.map((l) => [l.name, l.count, l.volume, l.commission]),
    ]);
  };

  return (
    <AdminPage title="Relatórios" description="Indicadores de crescimento, conversão e desempenho por período.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cadastros" value={String(profiles.data?.length ?? 0)} />
        <Stat label="Pedidos" value={String(totalQuotes)} />
        <Stat label="Conversão de pedidos" value={`${conversion}%`} />
        <Stat label="Ticket médio" value={brl(ticketMedio)} />
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Desempenho por mês</h2>
          <Button size="sm" variant="outline" onClick={exportMonthly} disabled={rows.length === 0}>
            <Download className="mr-1.5 h-4 w-4" /> Exportar CSV
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Mês</th>
                <th className="px-4 py-3">Novas assinaturas</th>
                <th className="px-4 py-3">Pedidos</th>
                <th className="px-4 py-3">Fechados</th>
                <th className="px-4 py-3">Ticket médio</th>
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
                  <td className="px-4 py-3">{brl(r.ticket)}</td>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Comissões por laboratório</h2>
          <Button size="sm" variant="outline" onClick={exportLabs} disabled={labsWithStatsSorted.length === 0}>
            <Download className="mr-1.5 h-4 w-4" /> Exportar CSV
          </Button>
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
              {labsWithStatsSorted.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-3">{l.name}</td>
                  <td className="px-4 py-3">{l.count}</td>
                  <td className="px-4 py-3">{brl(l.volume)}</td>
                  <td className="px-4 py-3">{brl(l.commission)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{Number(l.commission_percent)}%</td>
                </tr>
              ))}
              {quotesSemLab.length > 0 && (
                <tr className="border-t border-border">
                  <td className="px-4 py-3 italic text-muted-foreground">Sem laboratório</td>
                  <td className="px-4 py-3">{quotesSemLab.length}</td>
                  <td className="px-4 py-3">{brl(quotesSemLab.reduce((a, q) => a + (q.quoted_amount_cents ?? 0), 0))}</td>
                  <td className="px-4 py-3">—</td>
                  <td className="px-4 py-3">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {labsWithStatsSorted.length === 0 && <div className="mt-4"><Empty>Nenhum laboratório cadastrado.</Empty></div>}
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
