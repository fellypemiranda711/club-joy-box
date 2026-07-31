import { createFileRoute } from "@tanstack/react-router";
import { AdminPage, Empty, Stat } from "@/components/admin/AdminShell";
import { useAdminGate, useAdminLabs, useAdminQuotes } from "@/hooks/use-admin-data";
import { brl, commissionCents, isRevenueQuote, quoteStatusLabels } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/comissoes")({
  component: ComissoesPage,
});

function ComissoesPage() {
  const { isAdmin } = useAdminGate();
  const labs = useAdminLabs(isAdmin);
  const quotes = useAdminQuotes(isAdmin);

  const labList = labs.data ?? [];
  const closed = (quotes.data ?? []).filter((q) => isRevenueQuote(q.status));
  const pending = (quotes.data ?? []).filter((q) => q.status === "quoted");

  const total = closed.reduce((acc, q) => acc + commissionCents(q, labList), 0);
  const forecast = pending.reduce((acc, q) => acc + commissionCents(q, labList), 0);

  const byLab = labList.map((l) => {
    const rows = closed.filter((q) => q.lab_id === l.id);
    return {
      lab: l,
      count: rows.length,
      revenue: rows.reduce((acc, q) => acc + (q.quoted_amount_cents ?? 0), 0),
      commission: rows.reduce((acc, q) => acc + commissionCents(q, labList), 0),
    };
  });

  return (
    <AdminPage title="Comissões" description="Comissões geradas pelos pedidos fechados com cada laboratório.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Comissão realizada" value={brl(total)} hint={`${closed.length} pedidos fechados`} />
        <Stat label="Previsão em aberto" value={brl(forecast)} hint={`${pending.length} orçamentos enviados`} />
        <Stat label="Ticket médio" value={brl(closed.length ? Math.round(closed.reduce((a, q) => a + (q.quoted_amount_cents ?? 0), 0) / closed.length) : 0)} />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Por laboratório</h2>
        <div className="mt-4 space-y-3">
          {byLab.map((r) => (
            <div key={r.lab.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm">
              <div>
                <p className="font-medium">{r.lab.name}</p>
                <p className="text-muted-foreground">
                  {r.count} pedido(s) · faturado {brl(r.revenue)} · {r.lab.commission_percent}% de comissão
                </p>
              </div>
              <p className="font-display text-lg font-semibold">{brl(r.commission)}</p>
            </div>
          ))}
          {byLab.length === 0 && <Empty>Cadastre laboratórios para acompanhar comissões.</Empty>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Lançamentos</h2>
        <div className="mt-4 space-y-2 text-sm">
          {closed.map((q) => (
            <div key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/50 px-4 py-3">
              <span>
                {q.patient_name} · {quoteStatusLabels[q.status] ?? q.status} ·{" "}
                {new Date(q.created_at).toLocaleDateString("pt-BR")}
              </span>
              <span className="text-muted-foreground">
                {brl(q.quoted_amount_cents)} → {brl(commissionCents(q, labList))}
              </span>
            </div>
          ))}
          {closed.length === 0 && <Empty>Nenhum pedido fechado ainda.</Empty>}
        </div>
      </section>
    </AdminPage>
  );
}
