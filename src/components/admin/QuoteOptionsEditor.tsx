import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl } from "@/lib/admin";
import { MARKET_MULTIPLIER, marketPriceCents, savingsPercent, visionTiers } from "@/lib/quote-options";
import { buildOptionsMessage, buildWhatsappUrl, parseBRLToCents } from "@/lib/whatsapp";
import { VisionFieldPreview } from "@/components/VisionFieldPreview";

type LensProduct = {
  id: string;
  lab_id: string;
  name: string;
  lens_type: string | null;
  refraction_index: string | null;
  price_cents: number;
  cost_cents: number;
  active: boolean;
};

type Row = {
  lens_product_id: string;
  title: string;
  description: string;
  memberPrice: string;
};

function emptyRow(tier: number): Row {
  const meta = visionTiers.find((t) => t.tier === tier)!;
  return { lens_product_id: "", title: meta.title, description: meta.description, memberPrice: "" };
}

export function QuoteOptionsEditor(props: {
  quoteId: string;
  labId: string | null;
  patientName: string;
  memberName: string | null;
  phoneDigits: string | null;
  lensProducts: LensProduct[];
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Record<number, Row>>(() =>
    Object.fromEntries(visionTiers.map((t) => [t.tier, emptyRow(t.tier)])),
  );

  const options = useQuery({
    queryKey: ["quote-options", props.quoteId],
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

  useEffect(() => {
    if (!options.data?.length) return;
    setRows((prev) => {
      const next = { ...prev };
      for (const o of options.data) {
        next[o.tier] = {
          lens_product_id: o.lens_product_id ?? "",
          title: o.title,
          description: o.description ?? "",
          memberPrice: (o.member_price_cents / 100).toFixed(2).replace(".", ","),
        };
      }
      return next;
    });
  }, [options.data]);

  const products = useMemo(
    () => props.lensProducts.filter((p) => p.active && (!props.labId || p.lab_id === props.labId)),
    [props.lensProducts, props.labId],
  );

  const filled = visionTiers
    .map((t) => {
      const row = rows[t.tier]!;
      const cents = parseBRLToCents(row.memberPrice);
      if (!cents) return null;
      return {
        tier: t.tier,
        title: row.title.trim() || t.title,
        description: row.description.trim() || t.description,
        lens_product_id: row.lens_product_id || null,
        member_price_cents: cents,
        market_price_cents: marketPriceCents(cents),
      };
    })
    .filter(Boolean) as {
    tier: number;
    title: string;
    description: string;
    lens_product_id: string | null;
    member_price_cents: number;
    market_price_cents: number;
  }[];

  const save = useMutation({
    mutationFn: async () => {
      if (filled.length === 0) throw new Error("Preencha ao menos uma opção com valor.");
      const { error: delErr } = await supabase.from("quote_options").delete().eq("quote_id", props.quoteId);
      if (delErr) throw new Error("Não foi possível atualizar as opções.");
      const { error } = await supabase.from("quote_options").insert(
        filled.map((o) => ({
          quote_id: props.quoteId,
          lab_id: props.labId,
          tier: o.tier,
          title: o.title,
          description: o.description,
          lens_product_id: o.lens_product_id,
          member_price_cents: o.member_price_cents,
          market_price_cents: o.market_price_cents,
        })),
      );
      if (error) throw new Error("Não foi possível salvar as opções.");
      const { error: statusErr } = await supabase
        .from("quote_requests")
        .update({ status: "quoted" })
        .eq("id", props.quoteId);
      if (statusErr) throw new Error("Opções salvas, mas o status não foi atualizado.");
    },
    onSuccess: () => {
      toast.success("Opções enviadas para o associado.");
      queryClient.invalidateQueries({ queryKey: ["quote-options", props.quoteId] });
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function setRow(tier: number, patch: Partial<Row>) {
    setRows((prev) => ({ ...prev, [tier]: { ...prev[tier]!, ...patch } }));
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Opções de lentes por campo de visão</p>
          <p className="text-xs text-muted-foreground">
            O valor de mercado é calculado automaticamente ({MARKET_MULTIPLIER}x o valor de associado).
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Salvando..." : "Salvar e liberar ao associado"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!props.phoneDigits || filled.length === 0}
            onClick={() => {
              if (!props.phoneDigits) return;
              const url = buildWhatsappUrl(
                props.phoneDigits,
                buildOptionsMessage({
                  memberName: props.memberName,
                  patientName: props.patientName,
                  options: filled,
                }),
              );
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            Enviar opções por WhatsApp
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {visionTiers.map((t) => {
          const row = rows[t.tier]!;
          const cents = parseBRLToCents(row.memberPrice);
          const market = cents ? marketPriceCents(cents) : 0;
          const product = products.find((p) => p.id === row.lens_product_id);
          return (
            <div key={t.tier} className="rounded-lg border border-border bg-background p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-foreground">
                  Opção {t.tier}
                </span>
                <span>{t.description}</span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-4">
                <select
                  className="h-9 rounded-md border border-border bg-background px-2 text-xs md:col-span-2"
                  value={row.lens_product_id}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    setRow(t.tier, {
                      lens_product_id: e.target.value,
                      ...(p
                        ? {
                            title: p.name,
                            memberPrice: (p.price_cents / 100).toFixed(2).replace(".", ","),
                          }
                        : {}),
                    });
                  }}
                >
                  <option value="">Escolher lente da tabela (opcional)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.refraction_index ? ` ${p.refraction_index}` : ""} — {brl(p.price_cents)}
                    </option>
                  ))}
                </select>
                <Input
                  className="h-9 text-xs"
                  placeholder="Nome mostrado ao associado"
                  value={row.title}
                  onChange={(e) => setRow(t.tier, { title: e.target.value })}
                />
                <Input
                  className="h-9 text-xs"
                  placeholder="Valor associado (ex: 890,00)"
                  value={row.memberPrice}
                  onChange={(e) => setRow(t.tier, { memberPrice: e.target.value })}
                />
              </div>
              <Input
                className="mt-2 h-9 text-xs"
                placeholder="Descrição do campo de visão"
                value={row.description}
                onChange={(e) => setRow(t.tier, { description: e.target.value })}
              />
              {cents ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Associado {brl(cents)} · mercado {brl(market)} · economia {savingsPercent(cents, market)}%
                  {product ? ` · custo lab ${brl(product.cost_cents)} · margem ${brl(cents - product.cost_cents)}` : ""}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
