import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, CreditCard, FileText, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell } from "@/components/member/MemberShell";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { planCatalog } from "@/lib/plan-catalog";
import { getStripeEnvironment } from "@/lib/stripe";
import { createPortalSession } from "@/utils/payments.functions";

export const Route = createFileRoute("/_authenticated/area")({
  head: () => ({
    meta: [
      { title: "Área do associado | Vision Club" },
      { name: "description", content: "Painel do associado Vision Club: plano, carteirinha digital e orçamentos." },
      { property: "og:title", content: "Área do associado | Vision Club" },
      { property: "og:description", content: "Acompanhe seu plano, carteirinha digital e solicitações." },
    ],
  }),
  component: AreaPage,
});

const statusLabels: Record<string, string> = {
  pending: "Aguardando pagamento",
  incomplete: "Aguardando pagamento",
  trialing: "Período de teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  unpaid: "Pagamento em atraso",
  canceled: "Cancelada",
  expired: "Expirada",
};

function AreaPage() {
  const { user } = useSession();


  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const subscription = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const quotes = useQuery({
    queryKey: ["quotes", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("id, patient_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const openPortal = useMutation({
    mutationFn: async () => {
      const result = await createPortalSession({
        data: {
          returnUrl: `${window.location.origin}/area`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      return result.url;
    },
    onSuccess: (url) => window.open(url, "_blank", "noopener"),
    onError: (e: Error) => toast.error(e.message || "Não foi possível abrir a gestão de assinatura."),
  });

  const sub = subscription.data;
  const hasBilling = Boolean(sub?.stripe_customer_id);

  return (
    <MemberShell>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Olá{profile.data?.full_name ? `, ${profile.data.full_name.split(" ")[0]}` : ""}!
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Este é o seu painel Vision Club.</p>

      {!sub && !subscription.isLoading && (
        <div className="mt-8 rounded-2xl border border-border p-6">
          <h2 className="font-display text-lg font-semibold">Escolha seu plano</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione um plano, finalize o pagamento e sua carteirinha digital é gerada
            automaticamente.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {planCatalog.map((plan) => (
              <div key={plan.slug} className="rounded-xl border border-border p-4">
                <p className="font-medium">{plan.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.priceLabel}</p>
                <p className="mt-2 text-xs text-muted-foreground">{plan.summary}</p>
                <Button size="sm" className="mt-4 w-full" asChild>
                  <Link to="/assinar" search={{ plano: plan.slug }}>
                    Assinar
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>

      )}

      {sub && (
        <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">Carteirinha digital</p>
            <p className="mt-6 font-display text-2xl font-semibold">
              {profile.data?.full_name || "Associado Vision Club"}
            </p>
            <p className="mt-1 text-sm opacity-80">Plano {sub.plan_name}</p>
            <div className="mt-8 flex items-end justify-between text-sm">
              <div>
                <p className="opacity-70">Nº do associado</p>
                <p className="font-medium">{sub.member_number}</p>
              </div>
              <div className="text-right">
                <p className="opacity-70">Válida até</p>
                <p className="font-medium">
                  {new Date(sub.expires_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <InfoRow icon={<ShieldCheck className="h-4 w-4" />} label="Status" value={statusLabels[sub.status] ?? sub.status} />
            <InfoRow
              icon={<CreditCard className="h-4 w-4" />}
              label="Mensalidade"
              value={`${sub.installments}x R$ ${(sub.monthly_price_cents / 100).toFixed(2).replace(".", ",")}`}
            />
            <InfoRow
              icon={<CalendarClock className="h-4 w-4" />}
              label="Início"
              value={new Date(sub.started_at).toLocaleDateString("pt-BR")}
            />
          </div>
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold">Últimas solicitações</h2>
        </div>
        {quotes.data && quotes.data.length > 0 ? (
          <ul className="mt-4 divide-y divide-border text-sm">
            {quotes.data.map((q) => (
              <li key={q.id} className="flex items-center justify-between py-3">
                <span>{q.patient_name}</span>
                <span className="text-muted-foreground">
                  {new Date(q.created_at).toLocaleDateString("pt-BR")} · {q.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Você ainda não solicitou orçamentos.</p>
        )}
      </div>
    </MemberShell>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
