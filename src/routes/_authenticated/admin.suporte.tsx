import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminPage, Empty, Stat } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { QuoteChat } from "@/components/chat/QuoteChat";
import { supabase } from "@/integrations/supabase/client";
import {
  useAdminGate,
  useAdminMeasurements,
  useAdminProfiles,
  useAdminQuotes,
  useAdminSubs,
} from "@/hooks/use-admin-data";
import { buildWhatsappUrl, toE164Digits } from "@/lib/whatsapp";

type ChatMessage = {
  id: string;
  quote_id: string;
  is_admin: boolean;
  content: string;
  read_at: string | null;
  created_at: string;
};

function useSupportThreads(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-quote-messages"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_messages")
        .select("id, quote_id, is_admin, content, read_at, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
  });
}

export const Route = createFileRoute("/_authenticated/admin/suporte")({
  component: SuportePage,
});

type Ticket = {
  id: string;
  userId: string;
  title: string;
  detail: string;
  priority: "Alta" | "Média";
};

function SuportePage() {
  const { isAdmin } = useAdminGate();
  const subs = useAdminSubs(isAdmin);
  const quotes = useAdminQuotes(isAdmin);
  const profiles = useAdminProfiles(isAdmin);
  const measurements = useAdminMeasurements(isAdmin);

  const tickets: Ticket[] = [];

  for (const s of subs.data ?? []) {
    if (["past_due", "unpaid", "pending"].includes(s.status)) {
      tickets.push({
        id: `sub-${s.id}`,
        userId: s.user_id,
        title: "Pagamento pendente",
        detail: `${s.plan_name} · ${s.member_number}`,
        priority: "Alta",
      });
    }
  }

  for (const m of measurements.data ?? []) {
    if (m.status === "rejected") {
      tickets.push({
        id: `mea-${m.id}`,
        userId: m.user_id,
        title: "Medidas recusadas — associado precisa refazer",
        detail: m.admin_notes || "Sem observações",
        priority: "Média",
      });
    }
  }

  const now = Date.now();
  for (const q of quotes.data ?? []) {
    const days = (now - new Date(q.created_at).getTime()) / 86400000;
    if (["received", "quoting"].includes(q.status) && days > 2) {
      tickets.push({
        id: `quo-${q.id}`,
        userId: q.user_id,
        title: "Pedido sem retorno há mais de 48h",
        detail: `${q.patient_name} · aberto há ${Math.floor(days)} dia(s)`,
        priority: "Alta",
      });
    }
  }

  const high = tickets.filter((t) => t.priority === "Alta").length;

  return (
    <AdminPage title="Suporte" description="Fila de atendimento gerada automaticamente a partir dos dados do clube.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Chamados abertos" value={String(tickets.length)} />
        <Stat label="Prioridade alta" value={String(high)} />
        <Stat label="Associados" value={String(profiles.data?.length ?? 0)} />
      </div>

      <div className="mt-6 space-y-3">
        {tickets.map((t) => {
          const profile = profiles.data?.find((p) => p.id === t.userId);
          const digits = toE164Digits(profile?.phone);
          return (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm">
              <div>
                <p className="font-medium">
                  {t.title}{" "}
                  <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    {t.priority}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  {profile?.full_name || "Associado"} · {t.detail}
                </p>
              </div>
              {digits && (
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={buildWhatsappUrl(digits, "Olá! Aqui é da equipe Vision Club, tudo bem? 👋")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Falar no WhatsApp
                  </a>
                </Button>
              )}
            </div>
          );
        })}
        {tickets.length === 0 && <Empty>Nenhum chamado em aberto. Tudo em dia! 🎉</Empty>}
      </div>
    </AdminPage>
  );
}
