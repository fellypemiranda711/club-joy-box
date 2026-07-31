import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Plan = {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlight?: boolean;
  available: boolean;
};

export const plans: Plan[] = [
  {
    id: "individual",
    name: "Individual",
    price: "R$ 149",
    period: "/ano",
    description: "Para quem troca as próprias lentes com frequência.",
    features: [
      "1 associado",
      "Carteirinha digital",
      "Orçamentos ilimitados no ano",
      "Condições exclusivas com laboratórios parceiros",
      "Suporte por WhatsApp",
    ],
    available: true,
  },
  {
    id: "familia",
    name: "Família",
    price: "R$ 249",
    period: "/ano",
    description: "Cobertura para toda a casa, com um único plano.",
    features: [
      "Até 4 associados",
      "Carteirinha digital para cada dependente",
      "Orçamentos ilimitados no ano",
      "Condições exclusivas com laboratórios parceiros",
      "Prioridade no atendimento",
    ],
    highlight: true,
    available: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "Em breve",
    period: "",
    description: "Benefícios ampliados para usuários de multifocais.",
    features: [
      "Até 4 associados",
      "Tratamentos premium inclusos",
      "Consultoria de escolha de lentes",
      "Atendimento dedicado",
      "Benefícios adicionais com parceiros",
    ],
    available: false,
  },
];

export function PlanCards() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={cn(
            "flex flex-col rounded-2xl border border-border bg-card p-8 transition-all duration-300",
            plan.highlight && "border-primary/30 shadow-[0_20px_60px_-30px_oklch(0.31_0.088_258/0.5)]",
            !plan.available && "opacity-70",
          )}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-foreground">{plan.name}</h3>
            {plan.highlight && (
              <span className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-medium text-primary">
                Mais escolhido
              </span>
            )}
            {!plan.available && (
              <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Em breve
              </span>
            )}
          </div>

          <div className="mt-6 flex items-end gap-1">
            <span className="font-display text-4xl font-semibold tracking-tight text-foreground">
              {plan.price}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">{plan.period}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>

          <ul className="mt-8 flex-1 space-y-3">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-3 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Link
            to="/contato"
            className={cn(
              "mt-8 rounded-full px-5 py-3 text-center text-sm font-medium transition-opacity hover:opacity-90",
              plan.available
                ? plan.highlight
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-foreground"
                : "pointer-events-none bg-secondary text-muted-foreground",
            )}
          >
            {plan.available ? "Assinar plano" : "Disponível em breve"}
          </Link>
        </div>
      ))}
    </div>
  );
}
