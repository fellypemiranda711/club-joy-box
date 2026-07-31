import { createFileRoute, Link } from "@tanstack/react-router";
import { Section, SectionHeading } from "@/components/site/Section";
import { faqs } from "@/lib/faq-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Perguntas frequentes — Vision Club" },
      {
        name: "description",
        content:
          "Tire suas dúvidas sobre a assinatura do Vision Club, solicitação de orçamento, tipos de lente, montagem e formas de pagamento.",
      },
      { property: "og:title", content: "Perguntas frequentes — Vision Club" },
      {
        property: "og:description",
        content: "Dúvidas sobre assinatura, orçamentos, tipos de lente e pagamento.",
      },
    ],
  }),
  component: Faq,
});

function Faq() {
  return (
    <>
      <Section>
        <SectionHeading
          eyebrow="FAQ"
          title="Perguntas frequentes"
          description="Se a sua dúvida não estiver aqui, fale com a gente pelo WhatsApp ou pelo formulário de contato."
        />
        <div className="mx-auto mt-14 max-w-3xl">
          <Accordion type="single" collapsible>
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-12 text-center">
            <Link
              to="/contato"
              className="inline-flex rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Falar com o time
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
