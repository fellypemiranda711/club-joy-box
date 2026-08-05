import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient as useQC } from "@tanstack/react-query";
import { Eye, LogOut, Microscope, Package, Truck, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLabProfile, getLabOrders, updateLabFulfillment, type LabOrder } from "@/lib/lab.functions";
import { FULFILLMENT_STEPS, fulfillmentIndex } from "@/lib/fulfillment";

export const Route = createFileRoute("/_authenticated/lab")({
  component: LabPanel,
});

function LabPanel() {
  const navigate = useNavigate();
  const queryClient = useQC();

  const { data: lab, isLoading: labLoading, isError: labError } = useQuery({
    queryKey: ["lab-profile"],
    queryFn: () => getLabProfile(),
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["lab-orders"],
    queryFn: () => getLabOrders(),
    enabled: !!lab,
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/lab-login", replace: true });
  }

  if (labLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (labError || !lab) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar o painel. Verifique se sua conta está vinculada a um laboratório.
          </p>
          <Button variant="outline" className="mt-4" onClick={signOut}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  const list = orders ?? [];
  const inProduction = list.filter((o) => o.fulfillment_status === "paid" || o.fulfillment_status === "in_production");
  const shipped = list.filter((o) => o.fulfillment_status === "shipped");
  const delivered = list.filter((o) => o.fulfillment_status === "delivered");

  return (
    <div className="min-h-screen bg-secondary/40 lg:flex">
      <aside className="border-b border-border bg-background lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-6 py-6">
          <Microscope className="h-5 w-5 text-primary" />
          <div>
            <p className="font-display text-sm font-semibold leading-tight">{lab.name}</p>
            <p className="text-xs text-muted-foreground">Painel do laboratório</p>
          </div>
        </div>
        <div className="px-4 pb-6">
          <button
            onClick={signOut}
            className="inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <main className="w-full flex-1 px-6 py-10 lg:px-10">
        <div className="mx-auto w-full max-w-5xl">
          <header>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Pedidos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pedidos pagos e aprovados atribuídos ao {lab.name}.
            </p>
          </header>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard icon={Clock} label="Em produção" value={inProduction.length} />
            <StatCard icon={Truck} label="Enviados" value={shipped.length} />
            <StatCard icon={CheckCircle2} label="Entregues" value={delivered.length} />
          </div>

          <div className="mt-8 space-y-4">
            {ordersLoading && <p className="text-sm text-muted-foreground">Carregando pedidos...</p>}
            {list.length === 0 && !ordersLoading && (
              <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Nenhum pedido atribuído ao seu laboratório no momento.
              </p>
            )}
            {list.map((order) => (
              <LabOrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function LabOrderCard({ order }: { order: LabOrder }) {
  const [expanded, setExpanded] = useState(false);
  const current = fulfillmentIndex(order.fulfillment_status);

  const selectedOption = order.options.find((o) => o.selected);
  const hasMeasurements = order.measurements.length > 0;

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {order.patient_name}
          </p>
          <p className="text-sm text-muted-foreground">
            {order.member_name} · {new Date(order.created_at).toLocaleDateString("pt-BR")}
          </p>
          {order.member_phone && (
            <p className="text-xs text-muted-foreground">Contato: {order.member_phone}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">
            {order.quoted_amount_cents ? (order.quoted_amount_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {FULFILLMENT_STEPS[current]?.label ?? order.fulfillment_status}
          </p>
        </div>
      </div>

      {selectedOption && (
        <div className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Lente escolhida: </span>
          <span className="font-medium">{selectedOption.title}</span>
        </div>
      )}

      {order.lens_type && (
        <p className="mt-2 text-xs text-muted-foreground">Tipo: {order.lens_type}</p>
      )}
      {order.treatments.length > 0 && (
        <p className="text-xs text-muted-foreground">Tratamentos: {order.treatments.join(", ")}</p>
      )}
      {order.notes && (
        <p className="mt-2 text-xs text-muted-foreground">Obs: {order.notes}</p>
      )}

      {/* Status timeline */}
      <div className="mt-4 flex items-center gap-2">
        {FULFILLMENT_STEPS.map((step, i) => {
          const done = i <= current;
          return (
            <div key={step.key} className="flex items-center gap-1">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] ${
                  done ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              {i < FULFILLMENT_STEPS.length - 1 && (
                <span className={`h-px w-6 ${i < current ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {(order.tracking_code || order.carrier || order.estimated_delivery) && (
        <div className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          {order.carrier && <p>Transportadora: {order.carrier}</p>}
          {order.tracking_code && <p>Rastreio: {order.tracking_code}</p>}
          {order.estimated_delivery && (
            <p>Previsão: {new Date(`${order.estimated_delivery}T12:00:00`).toLocaleDateString("pt-BR")}</p>
          )}
        </div>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <Eye className="h-3.5 w-3.5" />
        {expanded ? "Ocultar detalhes" : "Ver detalhes e medidas"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          {/* Measurements */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Medidas</p>
            {hasMeasurements ? (
              <div className="mt-2 space-y-2">
                {order.measurements.map((m) => (
                  <div key={m.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                      <Meas label="DP" value={m.pd_mm} unit="mm" />
                      <Meas label="DNP Direito" value={m.dnp_right_mm} unit="mm" />
                      <Meas label="DNP Esquerdo" value={m.dnp_left_mm} unit="mm" />
                      <Meas label="Altura Direito" value={m.height_right_mm} unit="mm" />
                      <Meas label="Altura Esquerdo" value={m.height_left_mm} unit="mm" />
                      <Meas label="Ângulo pantoscópico" value={m.pantoscopic_angle_deg} unit="°" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Status: {m.status}</p>
                    {(m.front_photo_path || m.profile_photo_path) && (
                      <PhotoLinks front={m.front_photo_path} profile={m.profile_photo_path} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Ainda não foram enviadas medidas para este pedido.</p>
            )}
          </div>

          {/* Fulfillment controls */}
          <FulfillmentControls order={order} />
        </div>
      )}
    </div>
  );
}

function Meas({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value != null ? `${value}${unit}` : "—"}</span>
    </div>
  );
}

function PhotoLinks({ front, profile }: { front: string | null; profile: string | null }) {
  const [urls, setUrls] = useState<{ front?: string; profile?: string }>({});

  useQuery({
    queryKey: ["lab-photo-urls", front, profile],
    queryFn: async () => {
      const paths = [front, profile].filter(Boolean) as string[];
      if (paths.length === 0) return null;
      const { data } = await supabase.storage.from("measurements").createSignedUrls(paths, 3600);
      const u: { front?: string; profile?: string } = {};
      if (front && data) {
        const match = data.find((d) => d.path === front);
        if (match?.signedUrl) u.front = match.signedUrl;
      }
      if (profile && data) {
        const match = data.find((d) => d.path === profile);
        if (match?.signedUrl) u.profile = match.signedUrl;
      }
      setUrls(u);
      return null;
    },
  });

  return (
    <div className="mt-2 flex gap-3">
      {urls.front && (
        <a href={urls.front} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
          Ver foto frontal
        </a>
      )}
      {urls.profile && (
        <a href={urls.profile} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
          Ver foto perfil
        </a>
      )}
    </div>
  );
}

function FulfillmentControls({ order }: { order: LabOrder }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(order.tracking_code ?? "");
  const [carrier, setCarrier] = useState(order.carrier ?? "");
  const [eta, setEta] = useState(order.estimated_delivery ?? "");

  const update = useMutation({
    mutationFn: (vars: { status?: string; note?: string }) =>
      updateLabFulfillment({
        data: {
          quoteId: order.id,
          ...(vars.status ? { status: vars.status } : {}),
          trackingCode: code,
          carrier,
          estimatedDelivery: eta,
          ...(vars.note ? { note: vars.note } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Pedido atualizado.");
      queryClient.invalidateQueries({ queryKey: ["lab-orders"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível atualizar."),
  });

  const saveShipping = useMutation({
    mutationFn: () =>
      updateLabFulfillment({
        data: { quoteId: order.id, trackingCode: code, carrier, estimatedDelivery: eta },
      }),
    onSuccess: () => {
      toast.success("Dados de envio salvos.");
      queryClient.invalidateQueries({ queryKey: ["lab-orders"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível salvar."),
  });

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Atualizar produção</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {FULFILLMENT_STEPS.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={s.key === order.fulfillment_status ? "default" : "outline"}
            disabled={update.isPending}
            onClick={() => update.mutate({ status: s.key, note: s.label })}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Transportadora</Label>
          <Input className="h-9 text-xs" value={carrier} maxLength={60} onChange={(e) => setCarrier(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Código de rastreio</Label>
          <Input className="h-9 text-xs" value={code} maxLength={60} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Previsão de entrega</Label>
          <Input className="h-9 text-xs" type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
        </div>
      </div>

      <Button size="sm" variant="outline" className="mt-2" disabled={saveShipping.isPending} onClick={() => saveShipping.mutate()}>
        <Package className="mr-1.5 h-3.5 w-3.5" /> Salvar dados de envio
      </Button>
    </div>
  );
}
