import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, FileText, Loader2, SendHorizonal, Upload, X } from "lucide-react";
import { MemberShell } from "@/components/member/MemberShell";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import imgAntirreflexo from "@/assets/treatments/antirreflexo.jpg";
import imgFiltroAzul from "@/assets/treatments/filtro-azul.jpg";
import imgFotossensivel from "@/assets/treatments/fotossensivel.jpg";
import imgAfinamento from "@/assets/treatments/afinamento.jpg";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos | Vision Club" },
      {
        name: "description",
        content: "Solicite orçamentos de lentes com o Vision Club.",
      },
      { property: "og:title", content: "Orçamentos | Vision Club" },
      { property: "og:description", content: "Solicite orçamentos de lentes com o Vision Club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrcamentosPage,
});

const STATUS_LABELS: Record<string, string> = {
  pending: "Em análise",
  quoted: "Orçamento enviado",
  approved: "Aprovado",
  paid: "Pago",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const LENS_OPTIONS = [
  {
    value: "Visão simples",
    description:
      "Uma lente com um único grau, para ver de longe ou de perto. Ideal para quem usa óculos só para uma distância.",
  },
  {
    value: "Multifocal (progressiva)",
    description:
      "Corrige de longe e de perto na mesma lente, sem linha visível. Para quem tem grau diferente para cada distância.",
  },
  {
    value: "Ocupacional (computador)",
    description:
      "Feita para o trabalho em tela: nitidez no computador e na leitura, aliviando o cansaço visual no dia a dia.",
  },
  {
    value: "Não sei, quero ajuda",
    description:
      "Sem problema! Nossa equipe analisa sua receita e te indica a lente ideal para o seu uso.",
  },
];

const TREATMENT_OPTIONS: {
  value: string;
  description: string;
  example: string;
  image: string;
  alt: string;
}[] = [
  {
    value: "Antirreflexo",
    description:
      "Reduz os reflexos na lente: visão mais nítida e óculos mais bonitos nas fotos.",
    example:
      "Exemplo: numa videochamada, as pessoas enxergam seus olhos em vez do reflexo da janela na lente.",
    image: imgAntirreflexo,
    alt: "Comparação: à esquerda, lente com reflexos da janela; à direita, lente antirreflexo sem reflexos",
  },
  {
    value: "Filtro azul",
    description:
      "Ajuda a proteger os olhos da luz das telas de celular e computador.",
    example:
      "Exemplo: quem trabalha 8 horas por dia no computador sente menos ardência e cansaço no fim do dia.",
    image: imgFiltroAzul,
    alt: "Comparação: à esquerda, lente refletindo a luz forte da tela; à direita, lente com filtro azul",
  },
  {
    value: "Fotossensível",
    description:
      "A lente escurece no sol e volta ao normal dentro de casa. Duas em uma.",
    example:
      "Exemplo: você sai do consultório para a rua e a lente vira óculos de sol na hora, sem precisar trocar.",
    image: imgFotossensivel,
    alt: "Comparação: à esquerda, lente clara dentro de casa; à direita, a mesma lente escurecida no sol",
  },
  {
    value: "Afinamento",
    description:
      "Deixa a lente mais fina e leve, ideal para quem tem grau alto.",
    example:
      "Exemplo: com grau 6 em diante, a borda da lente fica bem mais discreta e o óculos fica mais leve no rosto.",
    image: imgAfinamento,
    alt: "Comparação vista de lado: à esquerda, lente grossa de grau alto; à direita, lente afinada",
  },
];

function OrcamentosPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const frameInputRef = useRef<HTMLInputElement | null>(null);

  const [patientName, setPatientName] = useState("");
  const [hasFrame, setHasFrame] = useState<"sim" | "nao" | null>(null);
  const [lensType, setLensType] = useState("");
  const [treatments, setTreatments] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [frameFile, setFrameFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");


  const requestsQuery = useQuery({
    queryKey: ["my-quote-requests", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("id, patient_name, lens_type, status, payment_status, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sessão expirada. Entre novamente.");
      if (patientName.trim().length < 3) throw new Error("Informe o nome do paciente.");
      if (!hasFrame) throw new Error("Informe se já possui a armação.");
      if (hasFrame === "nao") {
        throw new Error(
          "Para um orçamento preciso é necessário ter a armação escolhida. Escolha a armação e volte para continuar.",
        );
      }
      if (!frameFile) throw new Error("Envie uma foto ou imagem da armação.");


      const { data: hasActive, error: subError } = await supabase.rpc(
        "has_any_active_subscription",
        { user_uuid: user.id },
      );
      if (subError) throw subError;
      if (!hasActive) {
        throw new Error("É preciso ter uma assinatura ativa para solicitar orçamentos.");
      }

      let prescriptionPath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("prescriptions")
          .upload(path, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        prescriptionPath = path;
      }

      let framePath: string | null = null;
      if (frameFile) {
        const ext = frameFile.name.split(".").pop() ?? "bin";
        const path = `${user.id}/armacao-${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("prescriptions")
          .upload(path, frameFile, { contentType: frameFile.type });
        if (uploadError) throw uploadError;
        framePath = path;
      }

      const notesText = [
        `Armação: já possui`,
        framePath ? `Foto da armação: ${framePath}` : null,
        treatments.length > 0 ? `Tratamentos: ${treatments.join(", ")}` : null,
        notes.trim() ? `Observações: ${notes.trim()}` : null,
      ]

        .filter(Boolean)
        .join(" | ");

      const { error: insertError } = await supabase.from("quote_requests").insert({
        user_id: user.id,
        patient_name: patientName.trim(),
        lens_type: lensType || null,
        notes: notesText,
        prescription_path: prescriptionPath,
        status: "pending",
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada! Nossa equipe vai analisar e te retornar.");
      queryClient.invalidateQueries({ queryKey: ["my-quote-requests"] });
      setPatientName("");
      setHasFrame(null);
      setLensType("");
      setTreatments([]);
      setFile(null);
      setFrameFile(null);
      setNotes("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar. Tente novamente.");
    },
  });

  function pickFile(selected: File | null) {
    if (!selected) return;
    if (selected.size > 5 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 5 MB.");
      return;
    }
    setFile(selected);
  }

  function pickFrameFile(selected: File | null) {
    if (!selected) return;
    if (selected.size > 5 * 1024 * 1024) {
      toast.error("A imagem da armação deve ter no máximo 5 MB.");
      return;
    }
    setFrameFile(selected);
  }


  const isPending = submitMutation.isPending;

  return (
    <MemberShell>
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Novo orçamento</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Preencha os dados abaixo e nossa equipe prepara sua cotação com os laboratórios parceiros.
          </p>

          <form
            className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
            onSubmit={(e) => {
              e.preventDefault();
              submitMutation.mutate();
            }}
          >
            {/* Nome do paciente */}
            <div className="space-y-2">
              <label htmlFor="patient-name" className="text-sm font-medium">
                Nome de quem vai usar os óculos
              </label>
              <input
                id="patient-name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Digite o nome completo"
                maxLength={120}
                className="h-11 w-full rounded-xl border border-border bg-secondary/40 px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                disabled={isPending}
              />
            </div>

            {/* Armação */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Você já possui a armação?</p>
              <RadioGroup
                value={hasFrame ?? ""}
                onValueChange={(v) => setHasFrame(v as "sim" | "nao")}
                className="flex gap-4"
                disabled={isPending}
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="sim" id="frame-sim" />
                  Sim, já tenho
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="nao" id="frame-nao" />
                  Não, preciso de uma
                </label>
              </RadioGroup>
            </div>

            {/* Tipo de lente */}
            <div className="space-y-2">
              <label htmlFor="lens-type" className="text-sm font-medium">
                Tipo de lente
              </label>
              <select
                id="lens-type"
                value={lensType}
                onChange={(e) => setLensType(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-secondary/40 px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                disabled={isPending}
              >
                <option value="">Selecione...</option>
                {LENS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value}
                  </option>
                ))}
              </select>
              {lensType ? (
                <p className="rounded-xl bg-secondary/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  {LENS_OPTIONS.find((option) => option.value === lensType)?.description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Se tiver dúvida, escolha "Não sei, quero ajuda" e nossa equipe te orienta.
                </p>
              )}
            </div>

            {/* Tratamentos */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Tratamentos (opcional)</p>
              <p className="text-xs text-muted-foreground">
                Escolha os que quiser incluir na sua lente. Você pode marcar mais de um.
              </p>
              <div className="space-y-2">
                {TREATMENT_OPTIONS.map((option) => {
                  const checked = treatments.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={`block cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                        checked
                          ? "border-primary/50 bg-primary/5"
                          : "border-border bg-secondary/40 hover:border-primary/30"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isPending}
                          onChange={() =>
                            setTreatments((prev) =>
                              prev.includes(option.value)
                                ? prev.filter((t) => t !== option.value)
                                : [...prev, option.value],
                            )
                          }
                          className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                        />
                        <span className="text-sm font-medium">{option.value}</span>
                      </span>
                      <span className="mt-3 overflow-hidden rounded-lg border border-border">
                        <img
                          src={option.image}
                          alt={option.alt}
                          loading="lazy"
                          width={1200}
                          height={675}
                          className="block w-full"
                        />
                        <span className="flex justify-between bg-secondary/60 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          <span>Sem o tratamento</span>
                          <span>Com o tratamento</span>
                        </span>
                      </span>
                      <span className="mt-1.5 block pl-0 text-xs leading-relaxed text-muted-foreground">
                        {option.description}
                      </span>
                      {checked && option.example ? (
                        <span className="mt-1 block pl-0 text-xs leading-relaxed text-primary/90">
                          {option.example}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Receita */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Receita oftalmológica (opcional)</p>
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
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  disabled={isPending}
                >
                  <Upload className="h-4 w-4" />
                  Anexar foto ou PDF da receita (até 5 MB)
                </button>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Observações (opcional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: uso para dirigir, sensibilidade à luz, prazo..."
                maxLength={1000}
                rows={3}
                className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                disabled={isPending}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <SendHorizonal className="h-4 w-4" /> Enviar solicitação
                </>
              )}
            </Button>
          </form>
        </div>

        <aside>
          <h2 className="font-display text-xl font-semibold tracking-tight">Suas solicitações</h2>
          <div className="mt-4 space-y-3">
            {requestsQuery.isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : (requestsQuery.data?.length ?? 0) === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Você ainda não fez nenhuma solicitação.
              </p>
            ) : (
              requestsQuery.data!.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{req.patient_name}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                      <Clock className="h-3 w-3" />
                      {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    {req.lens_type ?? "Tipo de lente a definir"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(req.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </MemberShell>
  );
}
