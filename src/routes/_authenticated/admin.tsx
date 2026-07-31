import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MemberShell } from "@/components/member/MemberShell";
import { AdminNav, AdminRestricted } from "@/components/admin/AdminShell";
import { useAdminGate } from "@/hooks/use-admin-data";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel administrativo | Vision Club" },
      { name: "description", content: "Gestão de associados, assinaturas, pedidos e laboratórios do Vision Club." },
      { property: "og:title", content: "Painel administrativo | Vision Club" },
      { property: "og:description", content: "Gestão interna do clube de assinatura Vision Club." },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, isLoading } = useAdminGate();

  if (isLoading) {
    return (
      <MemberShell>
        <p className="text-sm text-muted-foreground">Verificando permissões...</p>
      </MemberShell>
    );
  }

  if (!isAdmin) return <AdminRestricted />;

  return (
    <MemberShell>
      <AdminNav />
      <Outlet />
    </MemberShell>
  );
}
