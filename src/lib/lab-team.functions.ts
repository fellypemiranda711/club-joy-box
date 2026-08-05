import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso restrito à equipe administrativa.");
}

/** Lista os usuários vinculados a um laboratório. */
export const listLabUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { labId: string }) => {
    if (!input.labId) throw new Error("Laboratório inválido.");
    return { labId: input.labId };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("lab_id", data.labId);
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) return [] as Array<{ userId: string; email: string | null; fullName: string; pending: boolean }>;

    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const usersById = new Map((usersPage?.users ?? []).map((u) => [u.id, u]));

    return (profiles ?? []).map((p) => {
      const u = usersById.get(p.id);
      return {
        userId: p.id,
        email: u?.email ?? null,
        fullName: p.full_name ?? "",
        pending: !u?.last_sign_in_at,
      };
    });
  });

/** Cria/convita um usuário de laboratório e o vincula a um lab. */
export const inviteLabUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; fullName: string; labId: string; tempPassword?: string }) => {
    const email = input.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("E-mail inválido.");
    if (!input.fullName.trim()) throw new Error("Informe o nome.");
    if (!input.labId) throw new Error("Selecione o laboratório.");
    if (input.tempPassword && input.tempPassword.length < 8) {
      throw new Error("A senha provisória precisa ter ao menos 8 caracteres.");
    }
    return { email, fullName: input.fullName.trim(), labId: input.labId, tempPassword: input.tempPassword?.trim() || undefined };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let user = (usersPage?.users ?? []).find((u) => u.email?.toLowerCase() === data.email) ?? null;
    let mode: "invited" | "created" = "created";

    if (!user) {
      if (data.tempPassword) {
        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password: data.tempPassword,
          email_confirm: true,
          user_metadata: { full_name: data.fullName },
        });
        if (error) throw new Error(error.message);
        user = created.user;
        mode = "created";
      } else {
        const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
          data: { full_name: data.fullName },
        });
        if (error) {
          throw new Error(
            `Não foi possível enviar o convite por e-mail (${error.message}). Defina uma senha provisória para criar o acesso agora.`,
          );
        }
        user = invited.user;
        mode = "invited";
      }
    }

    if (!user) throw new Error("Não foi possível criar o acesso.");

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: user.id, full_name: data.fullName, lab_id: data.labId }, { onConflict: "id" });

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.id, role: "lab" }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    return { mode, email: data.email };
  });

/** Remove o vínculo de um usuário com o laboratório. */
export const revokeLabUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "lab");
    if (roleError) throw new Error(roleError.message);

    await supabaseAdmin.from("profiles").update({ lab_id: null }).eq("id", data.userId);
    return { ok: true };
  });
