import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FULFILLMENT_STEPS } from "@/lib/fulfillment";

async function assertLab(context: { supabase: any; userId: string }): Promise<string> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "lab",
  });
  if (error || !data) throw new Error("Acesso restrito a laboratórios parceiros.");

  const { data: labId, error: labErr } = await context.supabase.rpc("get_user_lab_id");
  if (labErr || !labId) throw new Error("Sua conta não está vinculada a um laboratório.");
  return labId as string;
}

/** Retorna os dados do laboratório (nome) e o ID. */
export const getLabProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const labId = await assertLab(context as any);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lab, error } = await supabaseAdmin
      .from("labs")
      .select("id, name, contact_email, contact_phone")
      .eq("id", labId)
      .maybeSingle();
    if (error || !lab) throw new Error("Laboratório não encontrado.");
    return lab as { id: string; name: string; contact_email: string | null; contact_phone: string | null };
  });

export type LabOrder = {
  id: string;
  patient_name: string;
  lens_type: string | null;
  treatments: string[];
  notes: string | null;
  quoted_amount_cents: number | null;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  tracking_code: string | null;
  carrier: string | null;
  estimated_delivery: string | null;
  created_at: string;
  member_name: string;
  member_phone: string | null;
  measurements: Array<{
    id: string;
    pd_mm: number | null;
    dnp_right_mm: number | null;
    dnp_left_mm: number | null;
    height_right_mm: number | null;
    height_left_mm: number | null;
    pantoscopic_angle_deg: number | null;
    status: string;
    front_photo_path: string | null;
    profile_photo_path: string | null;
  }>;
  options: Array<{
    id: string;
    tier: number;
    title: string;
    selected: boolean;
    member_price_cents: number;
  }>;
};

/** Lista os pedidos pagos/aprovados atribuídos ao laboratório, com medidas e opções. */
export const getLabOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LabOrder[]> => {
    const labId = await assertLab(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: quotes, error } = await supabaseAdmin
      .from("quote_requests")
      .select("*")
      .eq("lab_id", labId)
      .in("status", ["approved", "completed"])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!quotes || quotes.length === 0) return [];

    const quoteIds = quotes.map((q) => q.id);
    const userIds = [...new Set(quotes.map((q) => q.user_id))];

    const [measurementsRes, optionsRes, profilesRes] = await Promise.all([
      supabaseAdmin
        .from("quote_measurements")
        .select("id, quote_id, pd_mm, dnp_right_mm, dnp_left_mm, height_right_mm, height_left_mm, pantoscopic_angle_deg, status, front_photo_path, profile_photo_path")
        .in("quote_id", quoteIds),
      supabaseAdmin
        .from("quote_options")
        .select("id, quote_id, tier, title, selected, member_price_cents")
        .in("quote_id", quoteIds)
        .order("tier", { ascending: true }),
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds),
    ]);

    const measurementsByQuote = new Map<string, LabOrder["measurements"]>();
    for (const m of measurementsRes.data ?? []) {
      const arr = measurementsByQuote.get(m.quote_id) ?? [];
      arr.push({
        id: m.id,
        pd_mm: m.pd_mm,
        dnp_right_mm: m.dnp_right_mm,
        dnp_left_mm: m.dnp_left_mm,
        height_right_mm: m.height_right_mm,
        height_left_mm: m.height_left_mm,
        pantoscopic_angle_deg: m.pantoscopic_angle_deg,
        status: m.status,
        front_photo_path: m.front_photo_path,
        profile_photo_path: m.profile_photo_path,
      });
      measurementsByQuote.set(m.quote_id, arr);
    }

    const optionsByQuote = new Map<string, LabOrder["options"]>();
    for (const o of optionsRes.data ?? []) {
      const arr = optionsByQuote.get(o.quote_id) ?? [];
      arr.push({ id: o.id, tier: o.tier, title: o.title, selected: o.selected, member_price_cents: o.member_price_cents });
      optionsByQuote.set(o.quote_id, arr);
    }

    const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));

    return quotes.map((q) => ({
      id: q.id,
      patient_name: q.patient_name,
      lens_type: q.lens_type,
      treatments: q.treatments ?? [],
      notes: q.notes,
      quoted_amount_cents: q.quoted_amount_cents,
      status: q.status,
      payment_status: q.payment_status,
      fulfillment_status: q.fulfillment_status,
      tracking_code: q.tracking_code,
      carrier: q.carrier,
      estimated_delivery: q.estimated_delivery,
      created_at: q.created_at,
      member_name: profileById.get(q.user_id)?.full_name ?? "Associado",
      member_phone: profileById.get(q.user_id)?.phone ?? null,
      measurements: measurementsByQuote.get(q.id) ?? [],
      options: optionsByQuote.get(q.id) ?? [],
    }));
  });

/** Atualiza o status de produção/envio do pedido (valida vínculo com o lab). */
export const updateLabFulfillment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    quoteId: string;
    status?: string;
    trackingCode?: string;
    carrier?: string;
    estimatedDelivery?: string;
    note?: string;
  }) => {
    if (input.status && !FULFILLMENT_STEPS.some((s) => s.key === input.status)) {
      throw new Error("Status de produção inválido.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const labId = await assertLab(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verifica que o pedido pertence a este lab
    const { data: quote, error: qErr } = await supabaseAdmin
      .from("quote_requests")
      .select("id, lab_id")
      .eq("id", data.quoteId)
      .maybeSingle();
    if (qErr || !quote) throw new Error("Pedido não encontrado.");
    if (quote.lab_id !== labId) throw new Error("Este pedido não pertence ao seu laboratório.");

    const update: Record<string, unknown> = {};
    if (data.status) update.fulfillment_status = data.status;
    if (data.trackingCode !== undefined) update.tracking_code = data.trackingCode.trim() || null;
    if (data.carrier !== undefined) update.carrier = data.carrier.trim() || null;
    if (data.estimatedDelivery !== undefined) update.estimated_delivery = data.estimatedDelivery || null;

    if (Object.keys(update).length > 0) {
      const { error: updErr } = await supabaseAdmin
        .from("quote_requests")
        .update(update)
        .eq("id", data.quoteId);
      if (updErr) throw new Error(updErr.message);
    }

    if (data.status) {
      const { error: evErr } = await supabaseAdmin.from("quote_status_events").insert({
        quote_id: data.quoteId,
        status: data.status,
        note: data.note ?? null,
        created_by: (context as any).userId,
      });
      if (evErr) throw new Error(evErr.message);
    }

    return { ok: true };
  });
