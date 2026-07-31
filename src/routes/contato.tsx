import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { MessageCircle, Instagram, Mail } from "lucide-react";
import { Section, SectionHeading } from "@/components/site/Section";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Vision Club" },
      {
        name: "description",
        content:
          "Fale com o time do Vision Club por WhatsApp, Instagram ou pelo formulário de contato.",
      },
      { property: "og:title", content: "Contato — Vision Club" },
      {
        property: "og:description",
        content: "Canais de atendimento do Vision Club: WhatsApp, Instagram e formulário.",
      },
    ],
  }),
  component: Contato,
});

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(100, "Nome muito longo"),
  email: z.string().trim().email("E-mail inválido").max(255),
  telefone: z.string().trim().min(8, "Informe um telefone válido").max(20),
  mensagem: z.string().trim().min(10, "Conte um pouco mais").max(1000, "Máximo de 1000 caracteres"),
});

const channels = [
  { icon: MessageCircle, title: "WhatsApp", text: "Atendimento de segunda a sexta, das 9h às 18h." },
  { icon: Instagram, title: "Instagram", text: "@visionclub — novidades e conteúdo sobre saúde visual." },
  { icon: Mail, title: "E-mail", text: "contato@visionclub.com.br" },
];

function Contato() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(form));

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success("Mensagem enviada! Nosso time responde em breve.");
      e.currentTarget?.reset?.();
    }, 600);
  }

  const field =
    "mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary";

  return (
    <Section>
      <SectionHeading
        eyebrow="Contato"
        title="Vamos conversar"
        description="Tire dúvidas sobre os planos, o funcionamento do clube ou parcerias com laboratórios."
      />

      <div className="mt-16 grid gap-12 md:grid-cols-2">
        <div className="space-y-4">
          {channels.map((c) => (
            <div key={c.title} className="flex gap-4 rounded-2xl border border-border p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft">
                <c.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">{c.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-8" noValidate>
          <div>
            <label htmlFor="nome" className="text-sm font-medium text-foreground">Nome</label>
            <input id="nome" name="nome" className={field} maxLength={100} />
            {errors.nome && <p className="mt-2 text-xs text-destructive">{errors.nome}</p>}
          </div>

          <div className="mt-5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</label>
            <input id="email" name="email" type="email" className={field} maxLength={255} />
            {errors.email && <p className="mt-2 text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="mt-5">
            <label htmlFor="telefone" className="text-sm font-medium text-foreground">Telefone</label>
            <input id="telefone" name="telefone" className={field} maxLength={20} />
            {errors.telefone && <p className="mt-2 text-xs text-destructive">{errors.telefone}</p>}
          </div>

          <div className="mt-5">
            <label htmlFor="mensagem" className="text-sm font-medium text-foreground">Mensagem</label>
            <textarea id="mensagem" name="mensagem" rows={5} className={field} maxLength={1000} />
            {errors.mensagem && <p className="mt-2 text-xs text-destructive">{errors.mensagem}</p>}
          </div>

          <button
            type="submit"
            disabled={sending}
            className="mt-8 w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {sending ? "Enviando..." : "Enviar mensagem"}
          </button>
        </form>
      </div>
    </Section>
  );
}
