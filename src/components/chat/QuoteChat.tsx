import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type QuoteMessage = {
  id: string;
  quote_id: string;
  sender_id: string;
  is_admin: boolean;
  content: string;
  created_at: string;
};

type Props = {
  quoteId: string;
  userId: string;
  /** true quando quem escreve é da equipe administrativa */
  asAdmin?: boolean;
  title?: string;
};

export function QuoteChat({ quoteId, userId, asAdmin = false, title = "Dúvidas sobre este orçamento" }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const queryKey = useMemo(() => ["quote-messages", quoteId], [quoteId]);

  const list = useQuery({
    queryKey,
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_messages")
        .select("id, quote_id, sender_id, is_admin, content, created_at")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as QuoteMessage[];
    },
  });

  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel(`quote-messages-${quoteId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "quote_messages", filter: `quote_id=eq.${quoteId}` },
        () => {
          queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, quoteId, queryClient, queryKey]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, list.data?.length]);

  const send = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("quote_messages")
        .insert({ quote_id: quoteId, sender_id: userId, is_admin: asAdmin, content });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error("Não foi possível enviar a mensagem."),
  });

  const submit = () => {
    const content = text.trim();
    if (!content) return;
    send.mutate(content.slice(0, 1500));
  };

  return (
    <div className="mt-3 rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          {title}
        </span>
        <span className="text-xs text-muted-foreground">{open ? "Fechar" : "Abrir chat"}</span>
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {list.isLoading && <p className="text-xs text-muted-foreground">Carregando conversa...</p>}
            {list.data?.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {asAdmin
                  ? "Nenhuma mensagem ainda. Responda o associado por aqui."
                  : "Nenhuma mensagem ainda. Escreva sua dúvida e nossa equipe responde por aqui."}
              </p>
            )}
            {list.data?.map((m) => {
              const mine = m.sender_id === userId;
              return (
                <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      mine
                        ? "max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-xs text-primary-foreground"
                        : "max-w-[85%] rounded-2xl bg-secondary px-3 py-2 text-xs text-foreground"
                    }
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <p className={mine ? "mt-1 text-[10px] opacity-70" : "mt-1 text-[10px] text-muted-foreground"}>
                      {m.is_admin ? "Equipe Vision Club" : "Associado"} ·{" "}
                      {new Date(m.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="mt-3 flex items-end gap-2">
            <Textarea
              rows={2}
              maxLength={1500}
              value={text}
              placeholder="Escreva sua mensagem..."
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <Button size="icon" onClick={submit} disabled={send.isPending || !text.trim()} aria-label="Enviar mensagem">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
