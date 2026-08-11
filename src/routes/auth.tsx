import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect:
      typeof search["redirect"] === "string" && search["redirect"].startsWith("/")
        ? search["redirect"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar | Vision Club" },
      {
        name: "description",
        content:
          "Acesse a área do associado Vision Club para ver sua carteirinha digital, plano e solicitações de orçamento.",
      },
      { property: "og:title", content: "Entrar na área do associado | Vision Club" },
      {
        property: "og:description",
        content: "Login e cadastro de associados do clube de assinatura de lentes Vision Club.",
      },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  password: z.string().min(6, { message: "A senha precisa ter ao menos 6 caracteres" }).max(72),
});

const signUpSchema = signInSchema.extend({
  password: z
    .string()
    .min(8, { message: "A senha precisa ter ao menos 8 caracteres" })
    .max(72)
    .regex(/[A-Za-z]/, { message: "A senha precisa conter letras" })
    .regex(/[0-9]/, { message: "A senha precisa conter números" }),
  fullName: z.string().trim().min(3, { message: "Informe seu nome completo" }).max(120),
  phone: z.string().trim().min(10, { message: "Informe um telefone válido" }).max(20),
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "" });

  const goNext = useCallback(() => {
    if (redirectTo) navigate({ href: redirectTo, replace: true });
    else goNext();
  }, [navigate, redirectTo]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goNext();
    });
  }, [goNext]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const parsed = signInSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          toast.error("E-mail ou senha incorretos.");
          return;
        }
        goNext();
      } else {
        const parsed = signUpSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: parsed.data.fullName, phone: parsed.data.phone },
          },
        });
        if (error) {
          const code = (error as { code?: string }).code ?? "";
          const msg = error.message.toLowerCase();
          if (code === "weak_password" || msg.includes("weak")) {
            toast.error(
              "Essa senha é muito comum e apareceu em vazamentos. Escolha outra senha mais forte (8+ caracteres, com letras, números e símbolos).",
            );
          } else if (msg.includes("registered") || msg.includes("already")) {
            toast.error("Este e-mail já está cadastrado. Faça login ou recupere a senha.");
          } else if (msg.includes("rate limit") || msg.includes("429")) {
            toast.error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
          } else {
            toast.error(error.message || "Não foi possível criar sua conta.");
          }
          return;
        }
        if (data.session) {
          goNext();
        } else {
          setEmailSent(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    const email = signInSchema.shape.email.safeParse(form.email);
    if (!email.success) {
      toast.error("Informe seu e-mail para recuperar a senha.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error("Não foi possível enviar o e-mail de recuperação.");
    else toast.success("Enviamos um e-mail com o link de recuperação.");
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-20">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        {mode === "signin" ? "Entrar" : "Criar conta"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signin"
          ? "Acesse sua área do associado Vision Club."
          : "Cadastre-se para ativar seu plano e usar os benefícios do clube."}
      </p>

      {emailSent ? (
        <div className="mt-8 rounded-2xl border border-border bg-secondary/40 p-6 text-sm">
          <p className="font-medium text-foreground">Confirme seu e-mail</p>
          <p className="mt-2 text-muted-foreground">
            Enviamos um link de confirmação para <strong>{form.email}</strong>. Depois de confirmar,
            volte aqui e faça login.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => { setEmailSent(false); setMode("signin"); }}>
            Voltar para o login
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input id="fullName" value={form.fullName} onChange={set("fullName")} maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={form.phone} onChange={set("phone")} maxLength={20} placeholder="(11) 90000-0000" />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={form.email} onChange={set("email")} maxLength={255} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={form.password} onChange={set("password")} maxLength={72} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>

          <div className="flex items-center justify-between pt-2 text-sm">
            <button
              type="button"
              className="text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Criar uma conta" : "Já tenho conta"}
            </button>
            {mode === "signin" && (
              <button
                type="button"
                className="text-muted-foreground underline-offset-4 hover:underline"
                onClick={onForgotPassword}
              >
                Esqueci minha senha
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
