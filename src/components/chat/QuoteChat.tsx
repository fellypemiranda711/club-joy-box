import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, MessageCircle, Paperclip, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const BUCKET = "chat-attachments";
const MAX_FILE_MB = 10;

type QuoteMessage = {
  id: string;
  quote_id: string;
  sender_id: string;
  is_admin: boolean;
  content: string;
  created_at: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
};

function Attachment({ path, name, type }: { path: string; name: string | null; type: string | null }) {
  const isImage = (type ?? "").startsWith("image/");
  const { data: url } = useQuery({
    queryKey: ["chat-attachment", path],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  if (!url) return <p className="mt-1 text-[10px] opacity-70">Carregando anexo...</p>;

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1 block">
        <img src={url} alt={name ?? "Anexo enviado no chat"} className="max-h-56 rounded-lg object-cover" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-1 flex items-center gap-2 rounded-lg bg-background/40 px-2 py-1.5 underline-offset-2 hover:underline"
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{name ?? "Arquivo"}</span>
    </a>
  );
}


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
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    mutationFn: async ({ content, file }: { content: string; file: File | null }) => {
      let attachment: { path: string; name: string; type: string } | null = null;

      if (file) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          throw new Error(`Arquivo maior que ${MAX_FILE_MB}MB.`);
        }
        const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
        const path = `${quoteId}/${crypto.randomUUID()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type || "application/octet-stream" });
        if (upErr) throw upErr;
        attachment = { path, name: file.name.slice(0, 120), type: file.type || "application/octet-stream" };
      }

      const { error } = await supabase.from("quote_messages").insert({
        quote_id: quoteId,
        sender_id: userId,
        is_admin: asAdmin,
        content: content || (attachment ? `📎 ${attachment.name}` : ""),
        attachment_path: attachment?.path ?? null,
        attachment_name: attachment?.name ?? null,
        attachment_type: attachment?.type ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error && e.message ? e.message : "Não foi possível enviar a mensagem."),
  });

  const submit = () => {
    const content = text.trim();
    if (!content && !file) return;
    send.mutate({ content: content.slice(0, 1500), file });
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
          <div className="max-h-80 overflow-y-auto rounded-xl bg-secondary/50 p-3">
            {list.isLoading && <p className="text-xs text-muted-foreground">Carregando conversa...</p>}
            {list.data?.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {asAdmin
                  ? "Nenhuma mensagem ainda. Responda o associado por aqui."
                  : "Nenhuma mensagem ainda. Escreva sua dúvida e nossa equipe responde por aqui."}
              </p>
            )}
            {list.data?.map((m, i) => {
              const mine = m.is_admin === asAdmin;
              const prev = list.data?.[i - 1];
              const dayLabel = new Date(m.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
              const showDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
              const grouped = prev && prev.is_admin === m.is_admin && !showDay;
              return (
                <div key={m.id}>
                  {showDay && (
                    <div className="my-2 flex justify-center">
                      <span className="rounded-full bg-background px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground shadow-sm">
                        {dayLabel}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${mine ? "justify-end" : "justify-start"} ${grouped ? "mt-1" : "mt-3"}`}>
                    <div
                      className={
                        mine
                          ? "max-w-[78%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-xs text-primary-foreground shadow-sm"
                          : "max-w-[78%] rounded-2xl rounded-bl-sm bg-card px-3 py-2 text-xs text-foreground shadow-sm ring-1 ring-border"
                      }
                    >
                      {!grouped && (
                        <p
                          className={
                            mine
                              ? "mb-0.5 text-[10px] font-semibold opacity-80"
                              : "mb-0.5 text-[10px] font-semibold text-muted-foreground"
                          }
                        >
                          {m.is_admin ? "Equipe Vision Club" : "Associado"}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      <p
                        className={
                          mine
                            ? "mt-1 text-right text-[10px] opacity-70"
                            : "mt-1 text-right text-[10px] text-muted-foreground"
                        }
                      >
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
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
