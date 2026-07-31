import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoMarker, type Pt } from "@/components/member/PhotoMarker";
import {
  CARD_WIDTH_MM,
  FRONT_MARKERS,
  PROFILE_MARKERS,
  computeFront,
  computePantoscopic,
  isPlausible,
  measurementStatusLabels,
} from "@/lib/measurements";

const MAX_BYTES = 8 * 1024 * 1024;

export function MeasurementDialog({
  quoteId,
  userId,
  patientName,
}: {
  quoteId: string;
  userId: string;
  patientName: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [frontPoints, setFrontPoints] = useState<Record<string, Pt>>({});
  const [profilePoints, setProfilePoints] = useState<Record<string, Pt>>({});

  const existing = useQuery({
    queryKey: ["measurement", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_measurements")
        .select("*")
        .eq("quote_id", quoteId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const frontUrl = useMemo(() => (frontFile ? URL.createObjectURL(frontFile) : null), [frontFile]);
  const profileUrl = useMemo(() => (profileFile ? URL.createObjectURL(profileFile) : null), [profileFile]);

  const result = computeFront(frontPoints);
  const angle = computePantoscopic(profilePoints);

  const save = useMutation({
    mutationFn: async () => {
      if (!frontFile) throw new Error("Envie a foto frontal com o cartão de referência.");
      if (!result) throw new Error("Marque todos os pontos da foto frontal.");

      const base = `${userId}/${quoteId}`;
      const frontExt = frontFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const frontPath = `${base}/frontal.${frontExt}`;
      const { error: upFront } = await supabase.storage
        .from("measurements")
        .upload(frontPath, frontFile, { upsert: true });
      if (upFront) throw new Error("Falha ao enviar a foto frontal.");

      let profilePath: string | null = null;
      if (profileFile) {
        const ext = profileFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        profilePath = `${base}/perfil.${ext}`;
        const { error: upProfile } = await supabase.storage
          .from("measurements")
          .upload(profilePath, profileFile, { upsert: true });
        if (upProfile) throw new Error("Falha ao enviar a foto de perfil.");
      }

      const payload = {
        quote_id: quoteId,
        user_id: userId,
        front_photo_path: frontPath,
        profile_photo_path: profilePath,
        reference_width_mm: CARD_WIDTH_MM,
        pd_mm: result.pd,
        dnp_right_mm: result.dnpRight,
        dnp_left_mm: result.dnpLeft,
        height_right_mm: result.heightRight,
        height_left_mm: result.heightLeft,
        pantoscopic_angle_deg: angle,
        points: { front: frontPoints, profile: profilePoints },
        status: "pending_review",
      };

      const { error } = await supabase
        .from("quote_measurements")
        .upsert(payload, { onConflict: "quote_id" });
      if (error) throw new Error("Não foi possível salvar as medidas.");
    },
    onSuccess: () => {
      toast.success("Medidas enviadas! A equipe vai conferir antes de mandar ao laboratório.");
      setOpen(false);
      setFrontFile(null);
      setProfileFile(null);
      setFrontPoints({});
      setProfilePoints({});
      queryClient.invalidateQueries({ queryKey: ["measurement", quoteId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saved = existing.data;

  function pickFile(file: File | null, setter: (f: File | null) => void, reset: () => void) {
    if (file && file.size > MAX_BYTES) {
      toast.error("A foto deve ter no máximo 8 MB.");
      return;
    }
    setter(file);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={saved ? "outline" : "default"}>
          {saved ? "Ver / refazer medidas" : "Tirar medidas por foto"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Medidas por foto — {patientName}</DialogTitle>
          <DialogDescription>
            Pré-medição de DP, DNP, altura e ângulo pantoscópico. Os valores são conferidos pela
            equipe antes de irem ao laboratório.
          </DialogDescription>
        </DialogHeader>

        {saved && (
          <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
            <p className="font-medium">
              Medidas registradas · {measurementStatusLabels[saved.status] ?? saved.status}
            </p>
            <p className="mt-1 text-muted-foreground">
              DP {saved.pd_mm} mm · DNP {saved.dnp_right_mm}/{saved.dnp_left_mm} mm · Altura{" "}
              {saved.height_right_mm}/{saved.height_left_mm} mm
              {saved.pantoscopic_angle_deg != null && ` · Pantoscópico ${saved.pantoscopic_angle_deg}°`}
            </p>
            {saved.admin_notes && <p className="mt-1 text-muted-foreground">Equipe: {saved.admin_notes}</p>}
          </div>
        )}

        <ol className="list-decimal space-y-1 rounded-xl border border-border p-4 pl-8 text-sm text-muted-foreground">
          <li>Use a armação escolhida e olhe direto para a câmera, na altura dos olhos.</li>
          <li>Segure um cartão de crédito na horizontal, encostado na testa.</li>
          <li>Peça para alguém tirar a foto a cerca de 1 metro de distância, sem zoom.</li>
          <li>Para o ângulo pantoscópico, tire também uma foto de perfil.</li>
        </ol>

        <div className="space-y-2">
          <Label htmlFor="front-photo">Foto frontal (obrigatória)</Label>
          <Input
            id="front-photo"
            type="file"
            accept="image/*"
            onChange={(e) =>
              pickFile(e.target.files?.[0] ?? null, setFrontFile, () => setFrontPoints({}))
            }
          />
        </div>

        {frontUrl && (
          <PhotoMarker
            src={frontUrl}
            markers={FRONT_MARKERS}
            points={frontPoints}
            onChange={setFrontPoints}
          />
        )}

        {result && (
          <div className="grid gap-2 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
            <Value label="DP (distância pupilar)" value={`${result.pd} mm`} />
            <Value label="DNP direita / esquerda" value={`${result.dnpRight} / ${result.dnpLeft} mm`} />
            <Value label="Altura direita / esquerda" value={`${result.heightRight} / ${result.heightLeft} mm`} />
            <Value label="Ângulo pantoscópico" value={angle != null ? `${angle}°` : "—"} />
            {!isPlausible(result) && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Os valores estão fora da faixa usual. Confira a marcação do cartão e das pupilas.
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="profile-photo">Foto de perfil (opcional — ângulo pantoscópico)</Label>
          <Input
            id="profile-photo"
            type="file"
            accept="image/*"
            onChange={(e) =>
              pickFile(e.target.files?.[0] ?? null, setProfileFile, () => setProfilePoints({}))
            }
          />
        </div>

        {profileUrl && (
          <PhotoMarker
            src={profileUrl}
            markers={PROFILE_MARKERS}
            points={profilePoints}
            onChange={setProfilePoints}
          />
        )}

        <p className="text-xs text-muted-foreground">
          A pré-medição por foto tem margem de erro de cerca de 1 mm e não substitui a conferência
          do óptico. O ângulo pantoscópico é uma estimativa.
        </p>

        <Button onClick={() => save.mutate()} disabled={save.isPending || !result}>
          {save.isPending ? "Enviando..." : "Enviar medidas para conferência"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Value({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
