import { createFileRoute } from "@tanstack/react-router";
import { AdminPage, Empty, Stat } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { useAdminGate, useAdminProfiles, useAdminQuotes, useAdminSubs } from "@/hooks/use-admin-data";
import { brl, crmStage, quoteStatusLabels } from "@/lib/admin";
import { isSubscriptionActive } from "@/lib/plan-catalog";
import { buildWhatsappUrl, toE164Digits } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin/crm")({
  component: CrmPage,
});

const PIPELINE = ["received", "quoting", "quoted", "approved", "completed"] as const;

function CrmPage() {
  const { isAdmin } = useAdminGate();
  const profiles = useAdminProfiles(isAdmin);
  const subs = useAdminSubs(isAdmin);
  const quotes = useAdminQuotes(isAdmin);

  const people = (profiles.data ?? []).map((p) => {
    const sub = subs.data?.find((s) => s.user_id === p.id) ?? null;
    const userQuotes = quotes.data?.filter((q) => q.user_id === p.id) ?? [];
    const active = isSubscriptionActive(sub);
    return { profile: p, sub, active, quoteCount: userQuotes.length, stage: crmStage(active, userQuotes.length) };
  });

  const leads = people.filter((p) => p.stage.label === "Lead").length;
  const negotiating = people.filter((p) => p.stage.label === "Em negociação").length;
  const clients = people.filter((p) => p.active).length;

  return (
    <AdminPage title="CRM" description="Relacionamento com os associados e funil de pedidos.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Leads" value={String(leads)} />
        <Stat label="Em negociação" value={String(negotiating)} />
        <Stat label="Clientes ativos" value={String(clients)} />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Funil de pedidos</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {PIPELINE.map((status) => {
            const count = quotes.data?.filter((q) => q.status === status).length ?? 0;
            return (
              <div key={status} className="rounded-xl border border-border p-4 text-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{quoteStatusLabels[status]}</p>
                <p className="mt-2 font-display text-xl font-semibold">{count}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Contatos</h2>
        <div className="mt-4 space-y-3">
          {people.map(({ profile, sub, quoteCount, stage }) => {
            const digits = toE164Digits(profile.phone);
            return (
              <div
                key={profile.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {profile.full_name || "Associado sem nome"}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${stage.tone}`}>{stage.label}</span>
                  </p>
                  <p className="text-muted-foreground">
                    {profile.phone || "sem telefone"} · {quoteCount} pedido(s)
                    {sub ? ` · ${sub.plan_name} · ${brl(sub.monthly_price_cents)}/mês` : " · sem plano"}
                  </p>
                </div>
                {digits && (
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={buildWhatsappUrl(
                        digits,
                        "Olá! Aqui é da equipe Vision Club. Posso te ajudar com o seu plano? 👋",
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            );
          })}
          {people.length === 0 && <Empty>Nenhum contato cadastrado.</Empty>}
        </div>
      </section>
    </AdminPage>
  );
}
