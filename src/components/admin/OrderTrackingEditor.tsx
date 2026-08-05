import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FULFILLMENT_STEPS } from "@/lib/fulfillment";

type Props = {
  quoteId: string;
  status: string | null;
  trackingCode: string | null;
  carrier: string | null;
  estimatedDelivery: string | null;
  adminId: string | undefined;
};

export function OrderTrackingEditor({
  quoteId,
  status,
  trackingCode,
  carrier,
  estimatedDelivery,
  adminId,
}: Props) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(trackingCode ?? "");
  const [shipper, setShipper] = useState(carrier ?? "");
  const [eta, setEta] = useState(estimatedDelivery ?? "");

  const update = useMutation({
    mutationFn: async ({ next, note }: { next?: string; note?: string }) => {
      const { error } = await supabase
        .from("quote_requests")
        .update({
          ...(next ? { fulfillment_status: next } : {}),
          tracking_code: code.trim() || null,
          carrier: shipper.trim() || null,
          estimated_delivery: eta || null,
        })
        .eq("id", quoteId);
      if (error) throw error;

      if (next) {
        const { error: evErr } = await supabase.from("quote_status_events").insert({
          quote_id: quoteId,
          status: next,
          note: note ?? null,
          created_by: adminId ?? null,
        });
        if (evErr) throw evErr;
      }
    },
    onSuccess: () => {
      toast.success("Rastreio atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote-status-events", quoteId] });
    },
    onError: () => toast.error("Não foi possível atualizar o rastreio."),
  });

  return (
    <div className="mt-3 rounded-lg border border-border p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rastreio do pedido</p>

      <div className="mt-2 flex flex-wrap gap-2">
        {FULFILLMENT_STEPS.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={s.key === status ? "default" : "outline"}
            disabled={update.isPending}
            onClick={() => update.mutate({ next: s.key })}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Input
          className="h-9 text-xs"
          placeholder="Transportadora"
          value={shipper}
          maxLength={60}
          onChange={(e) => setShipper(e.target.value)}
        />
        <Input
          className="h-9 text-xs"
          placeholder="Código de rastreio"
          value={code}
          maxLength={60}
          onChange={(e) => setCode(e.target.value)}
        />
        <Input className="h-9 text-xs" type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
      </div>

      <Button size="sm" variant="outline" className="mt-2" disabled={update.isPending} onClick={() => update.mutate({})}>
        Salvar dados de envio
      </Button>
    </div>
  );
}
