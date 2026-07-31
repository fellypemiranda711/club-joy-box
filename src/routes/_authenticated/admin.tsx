import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminGate } from "@/hooks/use-admin-data";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Console administrativo | Vision Club" },
      { name: "description", content: "Gestão de associados, assinaturas, pedidos e laboratórios do Vision Club." },
      { property: "og:title", content: "Console administrativo | Vision Club" },
      { property: "og:description", content: "Gestão interna do clube de assinatura Vision Club." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, isLoading } = useAdminGate();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-border p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta área é exclusiva da equipe administrativa do Vision Club.
          </p>
          <div className="mt-6 flex justify-center gap-3 text-sm">
            <Link to="/admin-login" className="rounded-full bg-primary px-4 py-2 text-primary-foreground">
              Entrar como administrador
            </Link>
            <Link to="/area" className="rounded-full px-4 py-2 text-muted-foreground hover:bg-secondary">
              Voltar ao painel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
