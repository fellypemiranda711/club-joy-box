import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const links = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/clientes", label: "Clientes", exact: false },
  { to: "/admin/assinaturas", label: "Assinaturas", exact: false },
  { to: "/admin/pedidos", label: "Pedidos", exact: false },
  { to: "/admin/laboratorios", label: "Laboratórios", exact: false },
  { to: "/admin/lentes", label: "Tabela de lentes", exact: false },
  { to: "/admin/comissoes", label: "Comissões", exact: false },
  { to: "/admin/relatorios", label: "Relatórios", exact: false },
  { to: "/admin/financeiro", label: "Financeiro", exact: false },
  { to: "/admin/suporte", label: "Suporte", exact: false },
  { to: "/admin/crm", label: "CRM", exact: false },
  { to: "/admin/equipe", label: "Equipe", exact: false },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin-login", replace: true });
  }

  return (
    <div className="min-h-screen bg-secondary/40 lg:flex">
      <aside className="border-b border-border bg-background lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-6 py-6">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <p className="font-display text-sm font-semibold leading-tight">Vision Club</p>
            <p className="text-xs text-muted-foreground">Console administrativo</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1 px-4 pb-4 lg:flex-col lg:flex-nowrap">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              inactiveProps={{ className: "text-muted-foreground hover:bg-secondary" }}
              className="rounded-xl px-3 py-2 text-sm transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
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
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

export function AdminPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </header>
      <div className="mt-6">{children}</div>
    </>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">{children}</p>;
}
