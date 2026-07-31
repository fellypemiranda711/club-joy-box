import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPage, Empty } from "@/components/admin/AdminShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAdminGate, useAdminProfiles, useAdminQuotes, useAdminSubs } from "@/hooks/use-admin-data";
import { brl, subStatusLabels } from "@/lib/admin";
import { buildWhatsappUrl, toE164Digits } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  component: ClientesPage,
});

function ClientesPage() {
  const { isAdmin } = useAdminGate();
  const profiles = useAdminProfiles(isAdmin);
  const subs = useAdminSubs(isAdmin);
  const quotes = useAdminQuotes(isAdmin);
  const [term, setTerm] = useState("");

  const rows = (profiles.data ?? [])
    .filter((p) => (p.full_name ?? "").toLowerCase().includes(term.toLowerCase()) || (p.phone ?? "").includes(term))
    .map((p) => {
      const sub = subs.data?.find((s) => s.user_id === p.id) ?? null;
      const quoteCount = quotes.data?.filter((q) => q.user_id === p.id).length ?? 0;
      return { profile: p, sub, quoteCount };
    });

  return (
    <AdminPage title="Clientes" description="Base de associados cadastrados no clube.">
      <Input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Buscar por nome ou telefone"
        className="max-w-sm"
      />

      <div className="mt-5 space-y-3">
        {rows.map(({ profile, sub, quoteCount }) => {
          const digits = toE164Digits(profile.phone);
          return (
            <div
              key={profile.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm"
            >
              <div>
                <p className="font-medium">{profile.full_name || "Associado sem nome"}</p>
                <p className="text-muted-foreground">
                  {profile.phone || "sem telefone"}
                  {profile.city ? ` · ${profile.city}/${profile.state ?? ""}` : ""} · {quoteCount} pedido(s)
                </p>
                <p className="text-muted-foreground">
                  {sub
                    ? `${sub.plan_name} · ${subStatusLabels[sub.status] ?? sub.status} · ${brl(sub.monthly_price_cents)}/mês`
                    : "Sem assinatura"}
                </p>
              </div>
              {digits && (
                <Button size="sm" variant="outline" asChild>
                  <a href={buildWhatsappUrl(digits, "Olá! Aqui é da equipe Vision Club. 👋")} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </Button>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <Empty>Nenhum cliente encontrado.</Empty>}
      </div>
    </AdminPage>
  );
}
