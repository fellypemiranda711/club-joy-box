import { createFileRoute } from "@tanstack/react-router";
import { MemberShell } from "@/components/member/MemberShell";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos | Vision Club" },
      {
        name: "description",
        content: "Área de orçamentos do associado Vision Club.",
      },
      { property: "og:title", content: "Orçamentos | Vision Club" },
      { property: "og:description", content: "Área de orçamentos do associado Vision Club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrcamentosPage,
});

function OrcamentosPage() {
  return (
    <MemberShell>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Orçamentos</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Estamos preparando uma nova experiência de orçamento. Em breve por aqui.
      </p>
    </MemberShell>
  );
}
