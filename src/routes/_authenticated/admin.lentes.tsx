import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Empty } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminGate, useAdminLabs, useAdminLensProducts } from "@/hooks/use-admin-data";
import { brl } from "@/lib/admin";
import { parseBRLToCents } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin/lentes")({
  component: LensTablePage,
});

const emptyForm = {
  lab_id: "",
  name: "",
  lens_type: "",
  refraction_index: "",
  treatments: "",
  cost: "",
  price: "",
  notes: "",
};

function LensTablePage() {
  const { isAdmin } = useAdminGate();
  const labs = useAdminLabs(isAdmin);
  const products = useAdminLensProducts(isAdmin);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [labFilter, setLabFilter] = useState("");
  const [search, setSearch] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-lens-products"] });

  const createProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lab_lens_products").insert({
        lab_id: form.lab_id,
        name: form.name.trim(),
        lens_type: form.lens_type.trim() || null,
        refraction_index: form.refraction_index.trim() || null,
        treatments: form.treatments
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        cost_cents: parseBRLToCents(form.cost) ?? 0,
        price_cents: parseBRLToCents(form.price) ?? 0,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lente adicionada à tabela.");
      setForm({ ...emptyForm, lab_id: form.lab_id });
      invalidate();
    },
    onError: () => toast.error("Não foi possível salvar a lente."),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("lab_lens_products").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("Não foi possível atualizar a lente."),
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lab_lens_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lente removida.");
      invalidate();
    },
    onError: () => toast.error("Não foi possível remover a lente."),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (products.data ?? [])
      .filter((p) => !labFilter || p.lab_id === labFilter)
      .filter(
        (p) =>
          !term ||
          p.name.toLowerCase().includes(term) ||
          (p.notes ?? "").toLowerCase().includes(term),
      );
  }, [products.data, labFilter, search]);

  return (
    <AdminPage
      title="Tabela de lentes"
      description="Catálogo de lentes por laboratório usado para montar os orçamentos dos associados."
    >
      <form
        className="grid gap-3 rounded-2xl border border-border bg-background p-5 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.lab_id) {
            toast.error("Selecione o laboratório.");
            return;
          }
          if (form.name.trim().length < 2) {
            toast.error("Informe o nome da lente.");
            return;
          }
          createProduct.mutate();
        }}
      >
        <div className="space-y-1">
          <Label className="text-xs">Laboratório</Label>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
            value={form.lab_id}
            onChange={(e) => setForm({ ...form, lab_id: e.target.value })}
          >
            <option value="">Selecione</option>
            {labs.data?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <Field label="Nome da lente" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field
          label="Tipo (visão simples, multifocal...)"
          value={form.lens_type}
          onChange={(v) => setForm({ ...form, lens_type: v })}
        />
        <Field
          label="Índice (1.56, 1.67...)"
          value={form.refraction_index}
          onChange={(v) => setForm({ ...form, refraction_index: v })}
        />
        <Field
          label="Tratamentos (separados por vírgula)"
          value={form.treatments}
          onChange={(v) => setForm({ ...form, treatments: v })}
        />
        <Field label="Custo do laboratório (R$)" value={form.cost} onChange={(v) => setForm({ ...form, cost: v })} />
        <Field label="Preço ao associado (R$)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
        <Field label="Observações" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <div className="flex items-end sm:col-span-3">
          <Button type="submit" disabled={createProduct.isPending}>
            Adicionar lente
          </Button>
        </div>
      </form>




      <div className="mt-4 space-y-3">
        {filtered.map((p) => {
          const lab = labs.data?.find((l) => l.id === p.lab_id);
          return (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4 text-sm"
            >
              <div>
                <p className="font-medium">
                  {p.name} {!p.active && <span className="text-xs text-muted-foreground">(inativa)</span>}
                </p>
                <p className="text-muted-foreground">
                  {lab?.name ?? "—"} · {p.lens_type || "tipo não informado"}
                  {p.refraction_index ? ` · índice ${p.refraction_index}` : ""}
                </p>
                <p className="text-muted-foreground">
                  Custo {brl(p.cost_cents)} · Associado {brl(p.price_cents)} · Margem{" "}
                  {brl(p.price_cents - p.cost_cents)}
                </p>
                {p.treatments.length > 0 && (
                  <p className="text-muted-foreground">Tratamentos: {p.treatments.join(", ")}</p>
                )}
                {p.notes && <p className="text-muted-foreground">{p.notes}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleActive.mutate({ id: p.id, active: !p.active })}>
                  {p.active ? "Desativar" : "Ativar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeProduct.mutate(p.id)}>
                  Remover
                </Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <Empty>Nenhuma lente cadastrada nessa seleção.</Empty>}
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
