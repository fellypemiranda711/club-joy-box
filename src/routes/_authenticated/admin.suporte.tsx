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
  const { user, isAdmin } = useAdminGate();
  const queryClient = useQueryClient();
  const subs = useAdminSubs(isAdmin);
  const quotes = useAdminQuotes(isAdmin);
  const profiles = useAdminProfiles(isAdmin);
  const measurements = useAdminMeasurements(isAdmin);
  const messages = useSupportThreads(isAdmin);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-support-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "quote_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-quote-messages"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  const markRead = useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await supabase
        .from("quote_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("quote_id", quoteId)
        .eq("is_admin", false)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-quote-messages"] }),
  });

  const threads = (() => {
    const map = new Map<string, ChatMessage[]>();
    for (const m of messages.data ?? []) {
      const arr = map.get(m.quote_id) ?? [];
      arr.push(m);
      map.set(m.quote_id, arr);
    }
    return [...map.entries()]
      .map(([quoteId, msgs]) => {
        const last = msgs[msgs.length - 1]!;
        const quote = quotes.data?.find((q) => q.id === quoteId);
        return {
          quoteId,
          last,
          quote,
          unread: msgs.filter((m) => !m.is_admin && !m.read_at).length,
        };
      })
      .sort((a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime());
  })();

  const unreadTotal = threads.reduce((acc, t) => acc + t.unread, 0);


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
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Chamados abertos" value={String(tickets.length)} />
        <Stat label="Prioridade alta" value={String(high)} />
        <Stat label="Mensagens não lidas" value={String(unreadTotal)} />
        <Stat label="Associados" value={String(profiles.data?.length ?? 0)} />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Conversas com associados</h2>
        <p className="text-xs text-muted-foreground">
          Todas as dúvidas enviadas nos orçamentos chegam aqui — responda direto por esta aba.
        </p>

        <div className="mt-3 space-y-3">
          {messages.isLoading && <p className="text-xs text-muted-foreground">Carregando conversas...</p>}
          {threads.map((t) => {
            const profile = profiles.data?.find((p) => p.id === t.quote?.user_id);
            const digits = toE164Digits(profile?.phone);
            return (
              <div key={t.quoteId} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {profile?.full_name || "Associado"}
                      {t.quote?.patient_name ? ` · ${t.quote.patient_name}` : ""}
                      {t.unread > 0 && (
                        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                          {t.unread} nova(s)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.last.is_admin ? "Você: " : ""}
                      {t.last.content} ·{" "}
                      {new Date(t.last.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {t.unread > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => markRead.mutate(t.quoteId)}>
                        Marcar como lida
                      </Button>
                    )}
                    {digits && (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={buildWhatsappUrl(digits, "Olá! Aqui é da equipe Vision Club, tudo bem? 👋")}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                {user && <QuoteChat quoteId={t.quoteId} userId={user.id} asAdmin title="Abrir conversa" />}
              </div>
            );
          })}
          {!messages.isLoading && threads.length === 0 && <Empty>Nenhuma conversa iniciada pelos associados.</Empty>}
        </div>
      </section>


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
