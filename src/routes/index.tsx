import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Sparkles,
  Wallet,
  Users,
  FileText,
  Truck,
  ArrowRight,
} from "lucide-react";
import heroImage from "@/assets/hero-lenses.jpg";
import { Section, SectionHeading } from "@/components/site/Section";
import { PlanCards } from "@/components/site/PlanCards";
import { faqs } from "@/lib/faq-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vision Club — Assinatura anual para lentes de grau" },
      {
        name: "description",
        content:
          "Assine o Vision Club e tenha condições exclusivas em lentes de grau negociadas com laboratórios parceiros. Monofocais, multifocais e ocupacionais.",
      },
      { property: "og:title", content: "Vision Club — Assinatura anual para lentes de grau" },
      {
        property: "og:description",
        content: "Condições exclusivas em lentes de grau para associados. Planos individual e família.",
      },
    ],
  }),
  component: Home,
});

const benefits = [
  {
    icon: Wallet,
    title: "Economia real",
    text: "Condições comerciais negociadas diretamente com laboratórios, sem intermediários de varejo.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança",
    text: "Laboratórios parceiros homologados, com padrão técnico e prazos acompanhados pela plataforma.",
  },
  {
    icon: Sparkles,
    title: "Sem burocracia",
    text: "Envie sua receita pela plataforma e receba a proposta na sua área exclusiva.",
  },
  {
    icon: Users,
    title: "Para a família",
    text: "Um único plano cobre até quatro associados, cada um com sua carteirinha digital.",
  },
];

const steps = [
  { n: "01", title: "Assine", text: "Escolha o plano anual e conclua o pagamento por Pix ou cartão." },
  { n: "02", title: "Acesse", text: "Receba acesso imediato à Área do Associado e à carteirinha digital." },
  { n: "03", title: "Solicite", text: "Envie sua receita e escolha o tipo de lente e os tratamentos." },
  { n: "04", title: "Aprove", text: "Receba a proposta do laboratório parceiro e aprove pela plataforma." },
  { n: "05", title: "Receba", text: "O laboratório produz e envia as lentes diretamente para você." },
];

const testimonials = [
  {
    name: "Carla M.",
    role: "Associada • Plano Família",
    text: "Trocamos as lentes dos três da casa no mesmo ano. A economia pagou a assinatura logo na primeira solicitação.",
  },
  {
    name: "Rodrigo A.",
    role: "Associado • Multifocal",
    text: "Minhas multifocais sempre foram caras. Pela plataforma o processo foi simples e o valor surpreendeu.",
  },
  {
    name: "Juliana P.",
    role: "Associada • Plano Individual",
    text: "Enviei a receita pelo celular e recebi a proposta em pouco tempo. Nada de vitrine, nada de vendedor.",
  },
];

function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-32">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-1.5 text-xs text-muted-foreground">
              Clube de assinatura • Saúde visual
            </span>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-6xl">
              Lentes de grau com condições que você não encontra no varejo.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              O Vision Club é uma assinatura anual que dá acesso a benefícios exclusivos
              negociados diretamente com laboratórios parceiros. Você solicita, aprova e
              recebe suas lentes em casa.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/planos"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Ver planos <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/como-funciona"
                className="inline-flex items-center rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Como funciona
              </Link>
            </div>
            <p className="mt-8 text-xs text-muted-foreground">
              O Vision Club não vende lentes. Oferece acesso a benefícios exclusivos.
            </p>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-border bg-secondary/40">
              <img
                src={heroImage}
                alt="Família usando óculos de grau e de sol"
                width={1408}
                height={1104}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <Section muted>
        <SectionHeading
          eyebrow="Benefícios"
          title="Uma nova forma de cuidar da sua visão"
          description="Sem loja, sem vitrine, sem pressão de venda. Apenas acesso direto a quem produz as suas lentes."
        />
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-border bg-card p-7 transition-shadow duration-300 hover:shadow-[0_20px_50px_-35px_oklch(0.31_0.088_258/0.6)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-5 font-display text-base font-semibold text-foreground">
                {b.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Como funciona */}
      <Section>
        <SectionHeading
          eyebrow="Como funciona"
          title="Cinco passos, do começo ao fim"
          description="Todo o processo acontece dentro da plataforma, do envio da receita até a entrega."
        />
        <div className="mt-16 grid gap-6 md:grid-cols-5">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border p-6">
              <span className="font-display text-sm font-semibold text-muted-foreground">
                {s.n}
              </span>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Receita enviada pela plataforma
          </span>
          <span className="inline-flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" /> Entrega direta do laboratório
          </span>
        </div>
      </Section>

      {/* Depoimentos */}
      <Section muted>
        <SectionHeading eyebrow="Depoimentos" title="Quem já é associado" />
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="rounded-2xl border border-border bg-card p-8">
              <blockquote className="text-sm leading-relaxed text-foreground">
                “{t.text}”
              </blockquote>
              <figcaption className="mt-6">
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <SectionHeading eyebrow="FAQ" title="Perguntas frequentes" />
        <div className="mx-auto mt-14 max-w-3xl">
          <Accordion type="single" collapsible>
            {faqs.slice(0, 5).map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-8 text-center">
            <Link to="/faq" className="text-sm text-primary hover:underline">
              Ver todas as perguntas
            </Link>
          </div>
        </div>
      </Section>

      {/* Planos */}
      <Section muted>
        <SectionHeading
          eyebrow="Planos"
          title="Escolha o plano do seu perfil"
          description="Assinatura anual, sem fidelidade mensal e com orçamentos ilimitados durante a vigência."
        />
        <div className="mt-16">
          <PlanCards />
        </div>
      </Section>

      {/* CTA */}
      <section className="bg-primary">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center md:py-28">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-primary-foreground md:text-4xl">
            Pronto para enxergar melhor pagando menos?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-primary-foreground/70">
            Assine o Vision Club e tenha acesso imediato às condições exclusivas dos nossos
            laboratórios parceiros.
          </p>
          <Link
            to="/planos"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-medium text-primary transition-opacity hover:opacity-90"
          >
            Quero ser associado <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
