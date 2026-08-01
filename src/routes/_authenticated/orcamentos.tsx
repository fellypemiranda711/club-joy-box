import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell } from "@/components/member/MemberShell";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { isSubscriptionActive, planBySlug } from "@/lib/plan-catalog";
import { MeasurementDialog } from "@/components/member/MeasurementDialog";
import { QuoteOptionsPicker } from "@/components/member/QuoteOptionsPicker";


export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({
    meta: [
      { title: "Solicitar orçamento | Vision Club" },
      { name: "description", content: "Envie sua receita e solicite um orçamento de lentes com os laboratórios parceiros." },
      { property: "og:title", content: "Solicitar orçamento | Vision Club" },
      { property: "og:description", content: "Envie a receita e receba condições exclusivas do clube." },
    ],
  }),
  component: OrcamentosPage,
});

const statusLabels: Record<string, string> = {
  received: "Recebida",
  quoting: "Em cotação",
  quoted: "Orçada",
  approved: "Aprovada",
  completed: "Concluída",
  canceled: "Cancelada",
};

const schema = z.object({
  patient_name: z.string().trim().min(3, "Informe o nome do paciente").max(120),
  lens_type: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function OrcamentosPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ patient_name: "", lens_type: "", notes: "", has_frame: "" });
  const [file, setFile] = useState<File | null>(null);

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

  const list = useQuery({
    queryKey: ["quotes", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!isActive) throw new Error("Ative sua assinatura para solicitar orçamentos.");
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");

      let prescriptionPath: string | null = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("A receita deve ter no máximo 5 MB.");
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
        const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("prescriptions").upload(path, file);
        if (upErr) throw new Error("Falha ao enviar a receita.");
        prescriptionPath = path;
      }

      const frameNote =
        form.has_frame === "sim"
          ? "Já possui a armação: Sim"
          : form.has_frame === "nao"
            ? "Já possui a armação: Não"
            : "";
      const notes = [frameNote, parsed.data.notes].filter(Boolean).join("\n");

      const { error } = await supabase.from("quote_requests").insert({
        user_id: user!.id,
        patient_name: parsed.data.patient_name,
        lens_type: parsed.data.lens_type || null,
        notes: notes || null,
        prescription_path: prescriptionPath,
      });
      if (error) throw new Error("Não foi possível registrar a solicitação.");
    },
    onSuccess: () => {
      toast.success("Solicitação enviada! Em breve retornamos com o orçamento.");
      setForm({ patient_name: "", lens_type: "", notes: "", has_frame: "" });
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["quotes", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const respond = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "canceled" }) => {
      const { error } = await supabase.rpc("respond_to_quote", {
        _quote_id: id,
        _decision: decision,
      });
      if (error) throw new Error("Não foi possível registrar sua resposta.");
    },
    onSuccess: (_d, vars) => {
      toast.success(
        vars.decision === "approved"
          ? "Orçamento aprovado! Agora envie as medidas por foto."
          : "Orçamento recusado.",
      );
      queryClient.invalidateQueries({ queryKey: ["quotes", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });



  const sub = subscription.data;
  const isActive = isSubscriptionActive(sub);
  const plan = planBySlug(sub?.plan_slug);
  const pairsLimit = plan?.pairsPerYear ?? 0;

  const cycleStart = sub?.current_period_start ?? sub?.started_at ?? null;
  const usedThisCycle = (list.data ?? []).filter(
    (q) =>
      q.status !== "canceled" &&
      (!cycleStart || new Date(q.created_at).getTime() >= new Date(cycleStart).getTime()),
  ).length;
  const overLimit = pairsLimit > 0 && usedThisCycle >= pairsLimit;

  return (
    <MemberShell>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Solicitações de orçamento</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Envie sua receita e nossa equipe negocia as condições com os laboratórios parceiros.
      </p>

      {!subscription.isLoading && !isActive && (
        <div className="mt-6 rounded-2xl border border-border bg-secondary/50 p-6">
          <p className="font-medium">Assinatura necessária</p>
          <p className="mt-1 text-sm text-muted-foreground">
            As solicitações de orçamento são exclusivas para associados com assinatura ativa.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/area">Ativar minha assinatura</Link>
          </Button>
        </div>
      )}

      {isActive && pairsLimit > 0 && (
        <div className="mt-6 rounded-xl border border-border px-4 py-3 text-sm">
          <span className="text-muted-foreground">Direitos do plano {plan?.name}: </span>
          <span className="font-medium">
            {Math.min(usedThisCycle, pairsLimit)} de {pairsLimit} {pairsLimit === 1 ? "par" : "pares"} usados neste ano de assinatura
          </span>
          {overLimit && (
            <p className="mt-1 text-muted-foreground">
              Você já usou todos os pares inclusos. Novas solicitações continuam permitidas, mas
              podem não ter o preço de laboratório do clube.
            </p>
          )}
        </div>
      )}

      <form
        className="mt-8 grid gap-4 rounded-2xl border border-border p-6 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="patient_name">Nome do paciente</Label>
          <Input
            id="patient_name"
            value={form.patient_name}
            maxLength={120}
            onChange={(e) => setForm((f) => ({ ...f, patient_name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lens_type">Tipo de lente</Label>
          <Input
            id="lens_type"
            placeholder="Multifocal, visão simples..."
            value={form.lens_type}
            maxLength={120}
            onChange={(e) => setForm((f) => ({ ...f, lens_type: e.target.value }))}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Você já possui a armação?</Label>
          <RadioGroup
            className="flex gap-6 pt-1"
            value={form.has_frame}
            onValueChange={(v) => setForm((f) => ({ ...f, has_frame: v }))}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="sim" id="frame-sim" />
              <Label htmlFor="frame-sim" className="font-normal">Sim, já tenho</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="nao" id="frame-nao" />
              <Label htmlFor="frame-nao" className="font-normal">Não, preciso de uma</Label>
            </div>
          </RadioGroup>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="prescription">Receita (PDF ou imagem, até 5 MB)</Label>
          <Input
            id="prescription"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            rows={4}
            maxLength={1000}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={create.isPending || !isActive}>
            {create.isPending ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </div>
      </form>

      <div className="mt-10">
        <h2 className="font-display text-lg font-semibold">Histórico</h2>
        {list.data && list.data.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {list.data.map((q) => (
              <li key={q.id} className="rounded-xl border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{q.patient_name}</span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                    {statusLabels[q.status] ?? q.status}
                  </span>
                </div>
                <p className="mt-2 text-muted-foreground">
                  {q.lens_type || "Tipo de lente não informado"} ·{" "}
                  {new Date(q.created_at).toLocaleDateString("pt-BR")}
                </p>
                {q.quoted_amount_cents != null && (
                  <p className="mt-1 font-medium text-foreground">
                    Orçamento: R$ {(q.quoted_amount_cents / 100).toFixed(2).replace(".", ",")}
                  </p>
                )}
                <QuoteOptionsPicker
                  quoteId={q.id}
                  canChoose={["received", "quoting", "quoted"].includes(q.status)}
                  {...(user ? { userId: user.id } : {})}
                />
                {q.status === "quoted" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={respond.isPending}
                      onClick={() => respond.mutate({ id: q.id, decision: "canceled" })}
                    >
                      Recusar
                    </Button>
                  </div>
                )}

                {(q.status === "approved" || q.status === "completed") && user && (
                  <div className="mt-3 space-y-2">
                    <p className="text-muted-foreground">
                      Orçamento aprovado — agora envie as medidas (DP, DNP, altura e ângulo
                      pantoscópico) por foto.
                    </p>
                    <MeasurementDialog quoteId={q.id} userId={user.id} patientName={q.patient_name} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma solicitação registrada ainda.</p>
        )}
      </div>
    </MemberShell>
  );
}
