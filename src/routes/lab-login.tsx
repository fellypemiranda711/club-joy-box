import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Microscope } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/lab-login")({
  head: () => ({
    meta: [
      { title: "Acesso do laboratório | Vision Club" },
      { name: "description", content: "Entrada exclusiva dos laboratórios parceiros do Vision Club." },
      { property: "og:title", content: "Acesso do laboratório | Vision Club" },
      { property: "og:description", content: "Entrada exclusiva dos laboratórios parceiros do Vision Club." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LabLogin,
});

async function isLabUser(userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "lab")
    .maybeSingle();
  return Boolean(data);
}

function LabLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (user && (await isLabUser(user.id))) {
        if (active) navigate({ to: "/lab", replace: true });
        return;
      }
      if (active) setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      toast.error("Não foi possível entrar", { description: "Verifique o e-mail e a senha." });
      return;
    }
    const isLab = await isLabUser(data.user.id);
    if (!isLab) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Acesso negado", { description: "Esta conta não está vinculada a um laboratório." });
      return;
    }
    navigate({ to: "/lab", replace: true });
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8">
        <div className="flex items-center gap-2">
          <Microscope className="h-5 w-5 text-primary" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Área do laboratório</span>
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Painel do laboratório</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acesso exclusivo dos laboratórios parceiros Vision Club.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lab-email">E-mail</Label>
            <Input
              id="lab-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lab-password">Senha</Label>
            <Input
              id="lab-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar no painel"}
          </Button>
        </form>
      </div>
    </div>
  );
}
