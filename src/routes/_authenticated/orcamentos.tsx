import { createFileRoute } from "@tanstack/react-router";
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
  const [form, setForm] = useState({ patient_name: "", lens_type: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);

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

      const { error } = await supabase.from("quote_requests").insert({
        user_id: user!.id,
        patient_name: parsed.data.patient_name,
        lens_type: parsed.data.lens_type || null,
        notes: parsed.data.notes || null,
        prescription_path: prescriptionPath,
      });
      if (error) throw new Error("Não foi possível registrar a solicitação.");
    },
    onSuccess: () => {
      toast.success("Solicitação enviada! Em breve retornamos com o orçamento.");
      setForm({ patient_name: "", lens_type: "", notes: "" });
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["quotes", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MemberShell>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Solicitações de orçamento</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Envie sua receita e nossa equipe negocia as condições com os laboratórios parceiros.
      </p>

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
          <Button type="submit" disabled={create.isPending}>
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
