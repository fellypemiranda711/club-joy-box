import { Link } from "@tanstack/react-router";
import { MemberShell } from "@/components/member/MemberShell";

const links = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/clientes", label: "Clientes", exact: false },
  { to: "/admin/assinaturas", label: "Assinaturas", exact: false },
  { to: "/admin/pedidos", label: "Pedidos", exact: false },
  { to: "/admin/laboratorios", label: "Laboratórios", exact: false },
  { to: "/admin/comissoes", label: "Comissões", exact: false },
  { to: "/admin/relatorios", label: "Relatórios", exact: false },
  { to: "/admin/financeiro", label: "Financeiro", exact: false },
  { to: "/admin/suporte", label: "Suporte", exact: false },
  { to: "/admin/crm", label: "CRM", exact: false },
] as const;

export function AdminNav() {
  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          activeOptions={{ exact: l.exact }}
          activeProps={{ className: "bg-primary text-primary-foreground" }}
          inactiveProps={{ className: "text-muted-foreground hover:bg-secondary" }}
          className="rounded-full px-3 py-1.5 text-xs transition-colors"
        >
          {l.label}
        </Link>
      ))}
    </nav>
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
    <div className="rounded-2xl border border-border p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">{children}</p>;
}

export function AdminRestricted() {
  return (
    <MemberShell>
      <h1 className="font-display text-2xl font-semibold">Acesso restrito</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Esta área é exclusiva da equipe administrativa do Vision Club.
      </p>
    </MemberShell>
  );
}
