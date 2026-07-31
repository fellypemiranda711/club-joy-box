import { createFileRoute } from "@tanstack/react-router";
import { Section, SectionHeading } from "@/components/site/Section";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre o Vision Club — Nossa história e propósito" },
      {
        name: "description",
        content:
          "Conheça a história, missão, visão e valores do Vision Club, o clube de assinatura brasileiro de saúde visual.",
      },
      { property: "og:title", content: "Sobre o Vision Club" },
      {
        property: "og:description",
        content: "História, missão, visão e valores do clube de assinatura de lentes de grau.",
      },
    ],
  }),
  component: Sobre,
});

const values = [
  { title: "Transparência", text: "Condições claras, sem letras miúdas e sem venda empurrada." },
  { title: "Acesso", text: "Lentes de qualidade não deveriam ser privilégio de poucos." },
  { title: "Tecnologia", text: "Processos digitais que eliminam etapas desnecessárias." },
  { title: "Cuidado", text: "Saúde visual em primeiro lugar, sempre." },
];

function Sobre() {
  return (
    <>
      <Section>
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Sobre
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Uma empresa de tecnologia dedicada à saúde visual.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
            O Vision Club nasceu de uma constatação simples: no Brasil, trocar as lentes de
            grau custa caro demais para quem precisa fazer isso com frequência. Criamos um
            clube de assinatura que reúne associados e negocia, em nome deles, condições
            comerciais diretamente com laboratórios parceiros.
          </p>
        </div>
      </Section>

      <Section muted>
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Missão
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Democratizar o acesso a lentes oftálmicas de qualidade por meio de um modelo de
              assinatura justo, digital e transparente.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Visão
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Ser o maior clube de benefícios em saúde visual do Brasil, reconhecido pela
              confiança dos associados e pela força da rede de laboratórios parceiros.
            </p>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Valores" title="O que orienta nossas decisões" />
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="rounded-2xl border border-border p-7">
              <h3 className="font-display text-base font-semibold text-foreground">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.text}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
