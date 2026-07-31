import { Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useSession } from "@/hooks/use-session";

const items = [
  { to: "/area", label: "Painel" },
  { to: "/perfil", label: "Meus dados" },
  { to: "/orcamentos", label: "Orçamentos" },
] as const;

export function MemberNav() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: isAdmin } = useIsAdmin(user?.id);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeProps={{ className: "bg-primary text-primary-foreground" }}
          inactiveProps={{ className: "text-muted-foreground hover:bg-secondary" }}
          className="rounded-full px-4 py-2 text-sm transition-colors"
        >
          {item.label}
        </Link>
      ))}
      {isAdmin && (
        <Link
          to="/admin"
          activeProps={{ className: "bg-primary text-primary-foreground" }}
          inactiveProps={{ className: "text-muted-foreground hover:bg-secondary" }}
          className="rounded-full px-4 py-2 text-sm transition-colors"
        >
          Admin
        </Link>
      )}
      <button
        onClick={signOut}
        className="ml-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary"
      >
        <LogOut className="h-4 w-4" /> Sair
      </button>
    </div>
  );
}

export function MemberShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <MemberNav />
      <div className="pt-8">{children}</div>
    </div>
  );
}
