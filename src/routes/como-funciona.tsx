import { createFileRoute, Link } from "@tanstack/react-router";
import { Section, SectionHeading } from "@/components/site/Section";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como funciona o Vision Club — Do orçamento à entrega" },
      {
        name: "description",
        content:
          "Entenda o fluxo completo do Vision Club: assinatura, acesso à área do associado, solicitação de orçamento, aprovação e entrega das lentes.",
      },
      { property: "og:title", content: "Como funciona o Vision Club" },
      {
        property: "og:description",
        content: "O fluxo completo da assinatura até a entrega das lentes pelo laboratório parceiro.",
      },
    ],
  }),
  component: ComoFunciona,
});

const flow = [
  {
    n: "01",
    title: "Cliente assina",
    text: "Escolha do plano anual (Individual ou Família) e pagamento por Pix ou cartão de crédito.",
  },
  {
    n: "02",
    title: "Recebe acesso",
    text: "Liberação imediata da Área do Associado, com carteirinha digital e dados do plano.",
  },
  {
    n: "03",
    title: "Solicita orçamento",
    text: "Envio da receita médica, informação sobre a armação, tipo de lente (monofocal, multifocal ou ocupacional), tratamentos desejados e observações.",
  },
  {
    n: "04",
    title: "Administrador recebe",
    text: "A solicitação é analisada e direcionada ao laboratório parceiro mais adequado à sua região e necessidade.",
  },
  {
    n: "05",
    title: "Cliente recebe proposta",
    text: "A proposta com valores exclusivos de associado fica disponível na plataforma.",
  },
  {
    n: "06",
    title: "Cliente aprova",
    text: "Com um clique, a proposta é aprovada e o pedido segue para produção.",
  },
  {
    n: "07",
    title: "Laboratório produz",
    text: "As lentes são produzidas conforme a receita e os tratamentos escolhidos.",
  },
  {
    n: "08",
    title: "Cliente recebe",
    text: "As lentes são entregues diretamente no seu endereço. A montagem fica a seu critério, onde preferir.",
  },
];

function ComoFunciona() {
  return (
    <>
      <Section>
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Como funciona
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Todo o processo, do orçamento à entrega.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
            O Vision Club conecta você diretamente a laboratórios parceiros. Nós cuidamos da
            negociação e do acompanhamento; o laboratório produz e entrega.
          </p>
        </div>
      </Section>

      <Section muted>
        <div className="mx-auto max-w-3xl">
          <ol className="relative border-l border-border pl-8">
            {flow.map((step) => (
              <li key={step.n} className="relative pb-12 last:pb-0">
                <span className="absolute -left-[41px] flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-[10px] font-medium text-primary">
                  {step.n}
                </span>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section>
        <SectionHeading
          title="Pronto para começar?"
          description="Escolha o plano ideal e tenha acesso imediato aos benefícios de associado."
        />
        <div className="mt-10 text-center">
          <Link
            to="/planos"
            className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ver planos
          </Link>
        </div>
      </Section>
    </>
  );
}
