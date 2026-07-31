import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminPage, Empty } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteAdmin, listAdmins, revokeAdmin, resetAdminPassword } from "@/lib/admin-team.functions";

export const Route = createFileRoute("/_authenticated/admin/equipe")({
  component: AdminTeam,
});

function AdminTeam() {
  const queryClient = useQueryClient();
  const fetchAdmins = useServerFn(listAdmins);
  const invite = useServerFn(inviteAdmin);
  const revoke = useServerFn(revokeAdmin);
  const resetPassword = useServerFn(resetAdminPassword);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const admins = useQuery({ queryKey: ["admin-team"], queryFn: () => fetchAdmins({}) });

  const inviteMutation = useMutation({
    mutationFn: () => invite({ data: tempPassword ? { email, fullName, tempPassword } : { email, fullName } }),
    onSuccess: (res) => {
      const message =
        res.mode === "invited"
          ? "Convite enviado por e-mail."
          : res.mode === "created"
            ? "Acesso criado com a senha provisória."
            : "Conta existente promovida a administrador.";
      toast.success(message, { description: res.email });
      setEmail("");
      setFullName("");
      setTempPassword("");
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
    onError: (e: Error) => toast.error("Não foi possível concluir", { description: e.message }),
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => revoke({ data: { userId } }),
    onSuccess: () => {
      toast.success("Acesso administrativo removido.");
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
    onError: (e: Error) => toast.error("Não foi possível remover", { description: e.message }),
  });

  const resetMutation = useMutation({
    mutationFn: (vars: { userId: string; password: string }) => resetPassword({ data: vars }),
    onSuccess: () => toast.success("Senha atualizada."),
    onError: (e: Error) => toast.error("Não foi possível atualizar", { description: e.message }),
  });

  return (
    <AdminPage
      title="Equipe administrativa"
      description="Crie contas exclusivas para cada pessoa da equipe — sem compartilhar login."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          inviteMutation.mutate();
        }}
        className="rounded-2xl border border-border bg-background p-6"
      >
        <h2 className="font-display text-lg font-semibold">Convidar administrador</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deixe a senha em branco para enviar um convite por e-mail. Informe uma senha provisória para liberar o acesso
          na hora.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="team-name">Nome</Label>
            <Input id="team-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-email">E-mail</Label>
            <Input
              id="team-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-password">Senha provisória (opcional)</Label>
            <Input
              id="team-password"
              type="text"
              autoComplete="off"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder="mín. 8 caracteres"
            />
          </div>
        </div>
        <Button type="submit" className="mt-5" disabled={inviteMutation.isPending}>
          {inviteMutation.isPending ? "Enviando..." : "Criar acesso"}
        </Button>
      </form>

      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold">Administradores ativos</h2>
        <div className="mt-4 space-y-3">
          {admins.isLoading && <Empty>Carregando equipe...</Empty>}
          {!admins.isLoading && (admins.data?.length ?? 0) === 0 && <Empty>Nenhum administrador cadastrado.</Empty>}
          {admins.data?.map((a) => (
            <div
              key={a.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-5"
            >
              <div>
                <p className="text-sm font-medium">{a.fullName || a.email || a.userId}</p>
                <p className="text-xs text-muted-foreground">{a.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.pending ? "Convite pendente — ainda não acessou" : "Acesso ativo"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const password = window.prompt("Nova senha para este administrador (mín. 8 caracteres):");
                    if (password) resetMutation.mutate({ userId: a.userId, password });
                  }}
                >
                  Definir senha
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (window.confirm("Remover o acesso administrativo desta conta?")) {
                      revokeMutation.mutate(a.userId);
                    }
                  }}
                >
                  Remover acesso
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminPage>
  );
}
