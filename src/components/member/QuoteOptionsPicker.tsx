import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/whatsapp";
import { savingsCents, savingsPercent, tierMeta } from "@/lib/quote-options";
import { VisionFieldPreview } from "@/components/VisionFieldPreview";

export function QuoteOptionsPicker(props: {
  quoteId: string;
  canChoose: boolean;
  userId?: string | undefined;
}) {
  const queryClient = useQueryClient();

  const options = useQuery({
    queryKey: ["member-quote-options", props.quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_options")
        .select("*")
        .eq("quote_id", props.quoteId)
        .order("tier");
      if (error) throw error;
      return data ?? [];
    },
  });

  const choose = useMutation({
    mutationFn: async (optionId: string) => {
      const { error } = await supabase.rpc("choose_quote_option", { _option_id: optionId });
      if (error) throw new Error("Não foi possível registrar sua escolha.");
    },
    onSuccess: () => {
      toast.success("Opção escolhida! Agora envie as medidas por foto.");
      queryClient.invalidateQueries({ queryKey: ["member-quote-options", props.quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quotes", props.userId] });
      queryClient.invalidateQueries({ queryKey: ["my-quote-requests", props.userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = options.data ?? [];
  if (list.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-medium">Escolha a sua lente</p>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((o) => {
          const meta = tierMeta(o.tier);
          const economia = savingsCents(o.member_price_cents, o.market_price_cents);
          return (
            <div
              key={o.id}
              className={`rounded-xl border p-4 ${o.selected ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Opção {o.tier}
                </span>
                {o.selected && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Escolhida</span>
                )}
              </div>
              <p className="mt-1 font-medium">{o.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{o.description || meta.description}</p>

              <VisionFieldPreview
                className="mt-3"
                tier={o.tier}
                label={`Simulação do campo de visão — ${meta.title}`}
              />

              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Campo de visão</span>
                  <span>{meta.fieldScore}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${meta.fieldScore}%` }} />
                </div>
              </div>

              <div className="mt-3 space-y-1 text-sm">
                <p className="text-xs text-muted-foreground line-through">
                  Média das óticas: {formatBRL(o.market_price_cents)}
                </p>
                <p className="text-lg font-semibold">{formatBRL(o.member_price_cents)}</p>
                <p className="text-xs text-primary">
                  Você economiza {formatBRL(economia)} ({savingsPercent(o.member_price_cents, o.market_price_cents)}%)
                </p>
              </div>

              {props.canChoose && (
                <Button
                  className="mt-3 w-full"
                  size="sm"
                  variant={o.selected ? "outline" : "default"}
                  disabled={choose.isPending}
                  onClick={() => choose.mutate(o.id)}
                >
                  {o.selected ? "Opção escolhida" : "Escolher esta lente"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
