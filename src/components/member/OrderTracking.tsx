import { useQuery } from "@tanstack/react-query";
import { Check, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FULFILLMENT_STEPS, fulfillmentIndex } from "@/lib/fulfillment";

type Props = {
  quoteId: string;
  status: string | null;
  trackingCode: string | null;
  carrier: string | null;
  estimatedDelivery: string | null;
};

export function OrderTracking({ quoteId, status, trackingCode, carrier, estimatedDelivery }: Props) {
  const current = fulfillmentIndex(status);

  const events = useQuery({
    queryKey: ["quote-status-events", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_status_events")
        .select("id, status, note, created_at")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mt-3 rounded-xl border border-border p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Truck className="h-4 w-4 text-muted-foreground" />
        Acompanhe seu pedido
      </p>

      <ol className="mt-4 space-y-4">
        {FULFILLMENT_STEPS.map((step, i) => {
          const done = i <= current;
          const isCurrent = i === current;
          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {i < FULFILLMENT_STEPS.length - 1 && (
                  <span className={`mt-1 h-8 w-px ${i < current ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
              <div className="pb-1">
                <p className={`text-sm ${isCurrent ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {(trackingCode || carrier || estimatedDelivery) && (
        <div className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          {carrier && <p>Transportadora: {carrier}</p>}
          {trackingCode && <p>Código de rastreio: {trackingCode}</p>}
          {estimatedDelivery && (
            <p>Previsão de entrega: {new Date(`${estimatedDelivery}T12:00:00`).toLocaleDateString("pt-BR")}</p>
          )}
        </div>
      )}

      {events.data && events.data.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {events.data.map((e) => (
            <li key={e.id}>
              {new Date(e.created_at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              — {FULFILLMENT_STEPS.find((s) => s.key === e.status)?.label ?? e.status}
              {e.note ? `: ${e.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
