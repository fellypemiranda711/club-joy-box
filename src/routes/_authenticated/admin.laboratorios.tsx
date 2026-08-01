import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Empty } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminGate, useAdminLabs, useAdminQuotes } from "@/hooks/use-admin-data";
import { brl, commissionCents, isRevenueQuote } from "@/lib/admin";
import { parseBRLToCents } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin/laboratorios")({
  component: LabsPage,
});

const emptyForm = { name: "", contact_email: "", contact_phone: "", city: "", state: "", commission_percent: "10" };

const emptyLensForm = {
  lab_id: "",
  name: "",
  lens_type: "",
  refraction_index: "",
  treatments: "",
  cost: "",
  price: "",
  notes: "",
};


function LabsPage() {
  const { isAdmin } = useAdminGate();
  const labs = useAdminLabs(isAdmin);
  const quotes = useAdminQuotes(isAdmin);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const createLab = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("labs").insert({
        name: form.name.trim(),
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        commission_percent: Number(form.commission_percent.replace(",", ".")) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Laboratório cadastrado.");
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["admin-labs"] });
    },
    onError: () => toast.error("Não foi possível cadastrar o laboratório."),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("labs").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-labs"] }),
    onError: () => toast.error("Não foi possível atualizar o laboratório."),
  });

  return (
    <AdminPage title="Laboratórios" description="Parceiros, condições comerciais e volume de pedidos.">
      <form
        className="grid gap-3 rounded-2xl border border-border p-5 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (form.name.trim().length < 2) {
            toast.error("Informe o nome do laboratório.");
            return;
          }
          createLab.mutate();
        }}
      >
        <Field label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="E-mail" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} />
        <Field label="Telefone" value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} />
        <Field label="Cidade" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
        <Field label="UF" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
        <Field
          label="Comissão (%)"
          value={form.commission_percent}
          onChange={(v) => setForm({ ...form, commission_percent: v })}
        />
        <div className="sm:col-span-3">
          <Button type="submit" disabled={createLab.isPending}>
            Cadastrar laboratório
          </Button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {labs.data?.map((l) => {
          const labQuotes = quotes.data?.filter((q) => q.lab_id === l.id) ?? [];
          const revenue = labQuotes
            .filter((q) => isRevenueQuote(q.status))
            .reduce((acc, q) => acc + (q.quoted_amount_cents ?? 0), 0);
          const commission = labQuotes
            .filter((q) => isRevenueQuote(q.status))
            .reduce((acc, q) => acc + commissionCents(q, labs.data ?? []), 0);
          return (
            <div
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm"
            >
              <div>
                <p className="font-medium">
                  {l.name} {!l.active && <span className="text-xs text-muted-foreground">(inativo)</span>}
                </p>
                <p className="text-muted-foreground">
                  {l.contact_email || "sem e-mail"} · {l.city ? `${l.city}/${l.state ?? ""}` : "sem cidade"} · comissão{" "}
                  {l.commission_percent}%
                </p>
                <p className="text-muted-foreground">
                  {labQuotes.length} pedido(s) · faturado {brl(revenue)} · comissão {brl(commission)}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => toggleActive.mutate({ id: l.id, active: !l.active })}>
                {l.active ? "Desativar" : "Ativar"}
              </Button>
            </div>
          );
        })}
        {labs.data?.length === 0 && <Empty>Nenhum laboratório cadastrado.</Empty>}
      </div>
    </AdminPage>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
