import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_BYTES = 8 * 1024 * 1024;

export function FramePhotoPanel({
  quoteId,
  userId,
}: {
  quoteId: string;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  const existing = useQuery({
    queryKey: ["frame-photo", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_measurements")
        .select("id, frame_photo_path")
        .eq("quote_id", quoteId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Escolha uma foto com a armação no rosto.");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/${quoteId}/armacao-no-rosto.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("measurements")
        .upload(path, file, { upsert: true });
      if (upErr) throw new Error("Não foi possível enviar a foto.");

      const row = existing.data;
      if (row?.id) {
        const { error } = await supabase
          .from("quote_measurements")
          .update({ frame_photo_path: path })
          .eq("id", row.id);
        if (error) throw new Error("Não foi possível salvar a foto.");
      } else {
        const { error } = await supabase
          .from("quote_measurements")
          .insert({ quote_id: quoteId, user_id: userId, frame_photo_path: path });
        if (error) throw new Error("Não foi possível salvar a foto.");
      }
    },
    onSuccess: () => {
      toast.success("Foto enviada! Agora você já pode tirar as medidas.");
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["frame-photo", quoteId] });
      queryClient.invalidateQueries({ queryKey: ["measurement", quoteId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saved = existing.data?.frame_photo_path;

  return (
    <div className="mt-3 rounded-xl border border-border bg-secondary/30 p-4">
      <p className="text-sm font-medium">Foto com a armação no rosto</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Coloque a armação escolhida, olhe direto para a câmera e envie a foto. Ela ajuda nossa
        equipe a conferir o encaixe antes da montagem.
      </p>
      {saved && (
        <p className="mt-2 text-xs text-primary">Foto recebida. Você pode enviar outra se quiser.</p>
      )}
      <div className="mt-3 space-y-2">
        <Label htmlFor={`frame-face-${quoteId}`} className="text-xs">
          Escolher foto (até 8 MB)
        </Label>
        <Input
          id={`frame-face-${quoteId}`}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const picked = e.target.files?.[0] ?? null;
            if (picked && picked.size > MAX_BYTES) {
              toast.error("A foto deve ter no máximo 8 MB.");
              return;
            }
            setFile(picked);
          }}
        />
      </div>
      <Button
        className="mt-3"
        size="sm"
        disabled={!file || send.isPending}
        onClick={() => send.mutate()}
      >
        {send.isPending ? "Enviando..." : "Enviar foto"}
      </Button>
    </div>
  );
}
