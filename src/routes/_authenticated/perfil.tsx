import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { MemberShell } from "@/components/member/MemberShell";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meus dados | Vision Club" },
      { name: "description", content: "Atualize seus dados pessoais e endereço de associado Vision Club." },
      { property: "og:title", content: "Meus dados | Vision Club" },
      { property: "og:description", content: "Dados pessoais e endereço do associado Vision Club." },
    ],
  }),
  component: PerfilPage,
});

const schema = z.object({
  full_name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  cpf: z.string().trim().min(11, "CPF inválido").max(14),
  phone: z.string().trim().min(10, "Telefone inválido").max(20),
  cep: z.string().trim().max(9).optional().or(z.literal("")),
  street: z.string().trim().max(120).optional().or(z.literal("")),
  number: z.string().trim().max(15).optional().or(z.literal("")),
  complement: z.string().trim().max(60).optional().or(z.literal("")),
  district: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(2).optional().or(z.literal("")),
});

type FormState = z.infer<typeof schema>;

const empty: FormState = {
  full_name: "", cpf: "", phone: "", cep: "", street: "", number: "", complement: "", district: "", city: "", state: "",
};

function PerfilPage() {
  const { user } = useSession();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile.data) {
      setForm({
        full_name: profile.data.full_name ?? "",
        cpf: profile.data.cpf ?? "",
        phone: profile.data.phone ?? "",
        cep: profile.data.cep ?? "",
        street: profile.data.street ?? "",
        number: profile.data.number ?? "",
        complement: profile.data.complement ?? "",
        district: profile.data.district ?? "",
        city: profile.data.city ?? "",
        state: profile.data.state ?? "",
      });
    }
  }, [profile.data]);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user!.id, ...parsed.data })
      .eq("id", user!.id);
    setSaving(false);
    if (error) toast.error("Não foi possível salvar seus dados.");
    else toast.success("Dados atualizados com sucesso.");
  }

  return (
    <MemberShell>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Meus dados</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Mantenha seus dados atualizados para agilizar orçamentos e entregas.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
        <Field id="full_name" label="Nome completo" value={form.full_name} onChange={set("full_name")} className="md:col-span-2" />
        <Field id="cpf" label="CPF" value={form.cpf} onChange={set("cpf")} />
        <Field id="phone" label="Telefone" value={form.phone} onChange={set("phone")} />
        <Field id="cep" label="CEP" value={form.cep ?? ""} onChange={set("cep")} />
        <Field id="street" label="Rua" value={form.street ?? ""} onChange={set("street")} />
        <Field id="number" label="Número" value={form.number ?? ""} onChange={set("number")} />
        <Field id="complement" label="Complemento" value={form.complement ?? ""} onChange={set("complement")} />
        <Field id="district" label="Bairro" value={form.district ?? ""} onChange={set("district")} />
        <Field id="city" label="Cidade" value={form.city ?? ""} onChange={set("city")} />
        <Field id="state" label="Estado (UF)" value={form.state ?? ""} onChange={set("state")} />
        <div className="md:col-span-2">
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
        </div>
      </form>
    </MemberShell>
  );
}

function Field({
  id, label, value, onChange, className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={onChange} />
    </div>
  );
}
