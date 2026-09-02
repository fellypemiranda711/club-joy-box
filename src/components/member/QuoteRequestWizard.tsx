import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, FileText, Loader2, SendHorizonal, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface QuoteWizardResult {
  patient_name: string;
  has_frame: "sim" | "nao";
  lens_type: string;
  notes: string;
  file: File | null;
}

interface QuoteRequestWizardProps {
  disabled?: boolean;
  isPending?: boolean;
  onSubmit: (result: QuoteWizardResult) => void;
}

const LENS_OPTIONS = [
  {
    value: "Visão simples",
    title: "Visão simples",
    description: "Corrige um grau só: para longe ou para perto.",
  },
  {
    value: "Multifocal (progressiva)",
    title: "Multifocal",
    description: "Longe, intermediário e perto na mesma lente, sem linha divisória.",
  },
  {
    value: "Ocupacional (computador)",
    title: "Ocupacional",
    description: "Conforto para telas e leitura em distâncias curtas e médias.",
  },
  {
    value: "Fotossensível",
    title: "Fotossensível",
    description: "Escurece no sol e clareia em ambiente interno.",
  },
  {
    value: "Solar com grau",
    title: "Solar com grau",
    description: "Lente escura com o seu grau, para usar ao ar livre.",
  },
  {
    value: "Não sei, quero ajuda",
    title: "Não sei ainda",
    description: "Nossa equipe analisa sua receita e te orienta na escolha.",
  },
];

type StepId = "name" | "frame" | "lens" | "prescription" | "notes" | "summary";

const STEP_ORDER: StepId[] = ["name", "frame", "lens", "prescription", "notes", "summary"];

const STEP_QUESTIONS: Record<StepId, string> = {
  name: "Olá! Vamos montar seu orçamento em poucos passos. Para começar, qual o nome de quem vai usar os óculos?",
  frame: "Perfeito. Essa pessoa já possui a armação que vai receber as lentes?",
  lens: "Ótimo. Agora me conta: qual tipo de lente você procura? Toque na opção que mais combina — se tiver dúvida, a gente te ajuda.",
  prescription: "Quase lá! Se quiser, envie a receita oftalmológica (foto ou PDF, até 5 MB). Isso agiliza a cotação com o laboratório.",
  notes: "Quer acrescentar alguma observação? Por exemplo: uso para dirigir, sensibilidade à luz, prazo...",
  summary: "Prontinho! Confira o resumo do seu pedido. Se estiver tudo certo, é só enviar.",
};

interface Message {
  id: number;
  from: "bot" | "user";
  content: React.ReactNode;
}

export function QuoteRequestWizard({ disabled, isPending, onSubmit }: QuoteRequestWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, from: "bot", content: STEP_QUESTIONS.name },
  ]);
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [hasFrame, setHasFrame] = useState<"sim" | "nao" | null>(null);
  const [lensType, setLensType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const idRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const step = STEP_ORDER[stepIndex] ?? "summary";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, step]);

  function push(from: "bot" | "user", content: React.ReactNode) {
    setMessages((prev) => [...prev, { id: idRef.current++, from, content }]);
  }

  function goTo(next: StepId) {
    const nextIndex = STEP_ORDER.indexOf(next);
    setStepIndex(nextIndex);
    push("bot", STEP_QUESTIONS[next]);
  }

  function answerText() {
    const value = input.trim();
    if (disabled || isPending) return;
    if (step === "name") {
      if (value.length < 3) return;
      setName(value);
      push("user", value);
      setInput("");
      goTo("frame");
    } else if (step === "notes") {
      setNotes(value);
      push("user", value || "Sem observações.");
      setInput("");
      goTo("summary");
    }
  }

  function answerFrame(value: "sim" | "nao") {
    if (disabled || isPending) return;
    setHasFrame(value);
    push("user", value === "sim" ? "Sim, já tenho a armação." : "Não, ainda preciso de uma.");
    goTo("lens");
  }

  function answerLens(option: (typeof LENS_OPTIONS)[number]) {
    if (disabled || isPending) return;
    setLensType(option.value);
    push("user", option.title);
    goTo("prescription");
  }

  function pickFile(selected: File | null) {
    if (selected && selected.size > 5 * 1024 * 1024) return;
    setFile(selected);
  }

  function confirmPrescription() {
    if (disabled || isPending) return;
    push(
      "user",
      file ? (
        <span className="inline-flex items-center gap-2">
          <FileText className="h-4 w-4" /> {file.name}
        </span>
      ) : (
        "Vou enviar a receita depois."
      ),
    );
    goTo("notes");
  }

  function submit() {
    if (disabled || isPending || !hasFrame) return;
    push("user", "Tudo certo, enviar solicitação! ✓");
    onSubmit({ patient_name: name, has_frame: hasFrame, lens_type: lensType, notes, file });
  }

  const summaryRows = useMemo(
    () => [
      ["Paciente", name],
      ["Armação", hasFrame === "sim" ? "Já possui" : "Precisa de uma"],
      ["Tipo de lente", lensType || "A definir com a equipe"],
      ["Receita", file ? file.name : "Não anexada"],
      ["Observações", notes || "—"],
    ],
    [name, hasFrame, lensType, file, notes],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-5 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">Assistente de orçamento</p>
          <p className="text-xs text-muted-foreground">
            Etapa {Math.min(stepIndex + 1, STEP_ORDER.length)} de {STEP_ORDER.length}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${((stepIndex + 1) / STEP_ORDER.length) * 100}%` }}
        />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-[380px] min-h-[280px] space-y-3 overflow-y-auto p-5">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.from === "user"
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md bg-secondary text-secondary-foreground",
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {/* Step content rendered inline under the last bot question */}
        {step === "frame" && (
          <div className="flex flex-wrap gap-2 pl-2">
            <Chip onClick={() => answerFrame("sim")}>Sim, já tenho</Chip>
            <Chip onClick={() => answerFrame("nao")}>Não, preciso de uma</Chip>
          </div>
        )}

        {step === "lens" && (
          <div className="grid gap-2 pl-2 sm:grid-cols-2">
            {LENS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => answerLens(option)}
                className="group rounded-xl border border-border bg-background p-3 text-left transition-all hover:border-primary hover:shadow-[var(--shadow-card)]"
              >
                <p className="text-sm font-medium group-hover:text-primary">{option.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
              </button>
            ))}
          </div>
        )}

        {step === "prescription" && (
          <div className="space-y-2 pl-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{file.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remover arquivo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Chip onClick={() => fileInputRef.current?.click()}>Anexar receita</Chip>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={confirmPrescription}>
                {file ? "Continuar com este arquivo" : "Enviar depois"}
              </Button>
            </div>
          </div>
        )}

        {step === "summary" && (
          <div className="space-y-3 pl-2">
            <div className="rounded-xl border border-border bg-background p-4">
              {summaryRows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 text-sm last:border-0"
                >
                  <span className="shrink-0 text-muted-foreground">{label}</span>
                  <span className="text-right font-medium">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={submit} disabled={disabled || isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Enviar solicitação
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStepIndex(0);
                  setInput("");
                  setName("");
                  setHasFrame(null);
                  setLensType("");
                  setFile(null);
                  setNotes("");
                  setMessages([{ id: idRef.current++, from: "bot", content: STEP_QUESTIONS.name }]);
                }}
                disabled={isPending}
              >
                <ArrowLeft className="h-4 w-4" /> Recomeçar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Input area for text steps */}
      {(step === "name" || step === "notes") && (
        <form
          className="flex items-center gap-2 border-t border-border bg-background p-3"
          onSubmit={(e) => {
            e.preventDefault();
            answerText();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={step === "name" ? "Digite o nome do paciente..." : "Escreva sua observação (opcional)..."}
            maxLength={step === "name" ? 120 : 1000}
            className="h-10 flex-1 rounded-full border border-border bg-secondary/40 px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            disabled={disabled || isPending}
          />
          {step === "notes" && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setInput(""); answerTextSkip(); }}>
              Pular
            </Button>
          )}
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 rounded-full"
            disabled={disabled || isPending || (step === "name" && input.trim().length < 3)}
            aria-label="Enviar resposta"
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );

  function answerTextSkip() {
    setNotes("");
    push("user", "Sem observações.");
    goTo("summary");
  }
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border bg-background px-4 py-2 text-sm transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
    >
      {children}
    </button>
  );
}
