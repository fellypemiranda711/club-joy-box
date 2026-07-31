import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

const PLAN_BY_PRICE: Record<string, { slug: string; name: string; cents: number }> = {
  plano_essencial_mensal: { slug: "essencial", name: "Essencial", cents: 1990 },
  plano_cuidado_mais_mensal: { slug: "cuidado-mais", name: "Cuidado+", cents: 3990 },
  plano_familia_mensal: { slug: "familia", name: "Família", cents: 8990 },
};

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}

function isoFromUnix(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  const item = subscription.items?.data?.[0];
  const priceId =
    item?.price?.lookup_key ||
    item?.price?.metadata?.lovable_external_id ||
    item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const plan = PLAN_BY_PRICE[priceId as string];

  const supabase = getSupabase();

  const base: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    price_id: priceId,
    product_id: typeof productId === "string" ? productId : productId?.id,
    status: subscription.status,
    current_period_start: isoFromUnix(periodStart),
    current_period_end: isoFromUnix(periodEnd),
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    environment: env,
    updated_at: new Date().toISOString(),
  };

  if (plan) {
    base["plan_slug"] = plan.slug;
    base["plan_name"] = plan.name;
    base["monthly_price_cents"] = plan.cents;
  }
  if (periodEnd) base["expires_at"] = isoFromUnix(periodEnd);

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("subscriptions").update(base).eq("id", existing.id);
    return;
  }

  if (!userId) {
    console.error("No userId in subscription metadata", subscription.id);
    return;
  }

  // Reuse a pending row created before checkout, if any.
  const { data: pending } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("environment", env)
    .is("stripe_subscription_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pending) {
    await supabase.from("subscriptions").update(base).eq("id", pending.id);
    return;
  }

  await supabase.from("subscriptions").insert({
    user_id: userId,
    plan_slug: plan?.slug ?? "essencial",
    plan_name: plan?.name ?? "Vision Club",
    monthly_price_cents: plan?.cents ?? 0,
    ...base,
  });
}

async function markCanceled(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await markCanceled(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
