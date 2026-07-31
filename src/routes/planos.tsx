import { createFileRoute } from "@tanstack/react-router";
import { Section, SectionHeading } from "@/components/site/Section";
import { PlanCards } from "@/components/site/PlanCards";
import { faqs } from "@/lib/faq-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos e preços — Vision Club" },
      {
        name: "description",
        content:
          "Conheça os planos anuais do Vision Club: Individual, Família e Premium. Orçamentos ilimitados e condições exclusivas em lentes de grau.",
      },
      { property: "og:title", content: "Planos e preços — Vision Club" },
      {
        property: "og:description",
        content: "Planos anuais Individual, Família e Premium com benefícios exclusivos em lentes.",
      },
    ],
  }),
  component: Planos,
});

function Planos() {
  return (
    <>
      <Section>
        <SectionHeading
          eyebrow="Planos"
          title="Assinatura anual, benefícios o ano inteiro"
          description="Sem taxa por solicitação. Você paga a assinatura uma vez por ano e usa quantas vezes precisar."
        />
        <div className="mt-16">
          <PlanCards />
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Os valores das lentes são pagos diretamente ao laboratório parceiro, com as condições
          exclusivas de associado.
        </p>
      </Section>

      <Section muted>
        <SectionHeading title="Dúvidas sobre os planos" />
        <div className="mx-auto mt-14 max-w-3xl">
          <Accordion type="single" collapsible>
            {faqs.slice(2, 8).map((f, i) => (
              <AccordionItem key={f.q} value={`plan-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>
    </>
  );
}
