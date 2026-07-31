import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminPage, Empty, Stat } from "@/components/admin/AdminShell";
import {
  useAdminGate,
  useAdminLabs,
  useAdminMeasurements,
  useAdminQuotes,
  useAdminSubs,
} from "@/hooks/use-admin-data";
import { brl, commissionCents, isRevenueQuote, quoteStatusLabels } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { isAdmin } = useAdminGate();
  const subs = useAdminSubs(isAdmin);
  const quotes = useAdminQuotes(isAdmin);
  const labs = useAdminLabs(isAdmin);
  const measurements = useAdminMeasurements(isAdmin);

  const active = subs.data?.filter((s) => s.status === "active") ?? [];
  const mrr = active.reduce((acc, s) => acc + s.monthly_price_cents, 0);
  const arr = mrr * 12;
  const openQuotes = quotes.data?.filter((q) => ["received", "quoting", "quoted"].includes(q.status)) ?? [];
  const commissions =
    quotes.data
      ?.filter((q) => isRevenueQuote(q.status))
      .reduce((acc, q) => acc + commissionCents(q, labs.data ?? []), 0) ?? 0;
  const pendingMeasurements = measurements.data?.filter((m) => m.status === "pending_review") ?? [];

  return (
    <AdminPage title="Dashboard" description="Visão geral do clube em tempo real.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Assinaturas ativas" value={String(active.length)} hint={`${subs.data?.length ?? 0} no total`} />
        <Stat label="Receita mensal" value={brl(mrr)} hint={`ARR ${brl(arr)}`} />
        <Stat label="Pedidos abertos" value={String(openQuotes.length)} hint={`${quotes.data?.length ?? 0} no total`} />
        <Stat label="Comissões geradas" value={brl(commissions)} hint={`${labs.data?.length ?? 0} laboratórios`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Pedidos recentes</h2>
            <Link to="/admin/pedidos" className="text-xs text-primary underline-offset-4 hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {openQuotes.slice(0, 5).map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2">
                <span className="font-medium">{q.patient_name}</span>
                <span className="text-xs text-muted-foreground">{quoteStatusLabels[q.status] ?? q.status}</span>
              </div>
            ))}
            {openQuotes.length === 0 && <Empty>Nenhum pedido em aberto.</Empty>}
          </div>
        </section>

        <section className="rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Fila de conferência</h2>
            <Link to="/admin/pedidos" className="text-xs text-primary underline-offset-4 hover:underline">
              Conferir medidas
            </Link>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {pendingMeasurements.slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2">
                <span className="font-medium">{m.quote_requests?.patient_name ?? "Associado"}</span>
                <span className="text-xs text-muted-foreground">DP {m.pd_mm ?? "—"} mm</span>
              </div>
            ))}
            {pendingMeasurements.length === 0 && <Empty>Nenhuma medida aguardando conferência.</Empty>}
          </div>
        </section>
      </div>
    </AdminPage>
  );
}
