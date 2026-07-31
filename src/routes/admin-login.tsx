import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Acesso administrativo | Vision Club" },
      { name: "description", content: "Entrada exclusiva da equipe administrativa do Vision Club." },
      { property: "og:title", content: "Acesso administrativo | Vision Club" },
      { property: "og:description", content: "Entrada exclusiva da equipe administrativa do Vision Club." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

async function isAdminUser(userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (user && (await isAdminUser(user.id))) {
        if (active) navigate({ to: "/admin", replace: true });
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
    const admin = await isAdminUser(data.user.id);
    if (!admin) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Acesso negado", { description: "Esta conta não faz parte da equipe administrativa." });
      return;
    }
    navigate({ to: "/admin", replace: true });
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
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Área restrita</span>
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Console administrativo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acesso exclusivo da equipe Vision Club.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">E-mail corporativo</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Senha</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar no console"}
          </Button>
        </form>
      </div>
    </div>
  );
}
