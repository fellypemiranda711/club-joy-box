import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso restrito à equipe administrativa.");
}

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "admin");
    if (error) throw new Error(error.message);

    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [] as Array<{
      userId: string;
      email: string | null;
      fullName: string;
      grantedAt: string;
      lastSignInAt: string | null;
      pending: boolean;
    }>;

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);

    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const usersById = new Map((usersPage?.users ?? []).map((u) => [u.id, u]));

    return (roles ?? []).map((r) => {
      const u = usersById.get(r.user_id);
      return {
        userId: r.user_id,
        email: u?.email ?? null,
        fullName: profiles?.find((p) => p.id === r.user_id)?.full_name ?? "",
        grantedAt: r.created_at,
        lastSignInAt: u?.last_sign_in_at ?? null,
        pending: !u?.last_sign_in_at,
      };
    });
  });

export const inviteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; fullName: string; tempPassword?: string }) => {
    const email = input.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("E-mail inválido.");
    if (input.tempPassword && input.tempPassword.length < 8) {
      throw new Error("A senha provisória precisa ter ao menos 8 caracteres.");
    }
    return { email, fullName: input.fullName.trim(), tempPassword: input.tempPassword?.trim() || undefined };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let user = (usersPage?.users ?? []).find((u) => u.email?.toLowerCase() === data.email) ?? null;
    let mode: "invited" | "created" | "promoted" = "promoted";

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
      .upsert({ id: user.id, full_name: data.fullName || user.email || "" }, { onConflict: "id" });

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    return { mode, email: data.email };
  });

export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    if (data.userId === (context as any).userId) {
      throw new Error("Você não pode remover o próprio acesso administrativo.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) throw new Error("É necessário manter ao menos um administrador.");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; password: string }) => {
    if (input.password.trim().length < 8) throw new Error("A senha precisa ter ao menos 8 caracteres.");
    return { userId: input.userId, password: input.password.trim() };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
