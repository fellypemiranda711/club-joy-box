import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type MarkerDef = { key: string; label: string; hint: string };
export type Pt = { x: number; y: number };

/**
 * Editor de marcação sobre a foto. Os pontos são normalizados pela LARGURA da
 * imagem (x e y), para que as distâncias sejam comparáveis em qualquer eixo.
 */
export function PhotoMarker({
  src,
  markers,
  points,
  onChange,
}: {
  src: string;
  markers: readonly MarkerDef[];
  points: Record<string, Pt>;
  onChange: (points: Record<string, Pt>) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const firstMissing = markers.find((m) => !points[m.key])?.key ?? markers[0]!.key;
  const [active, setActive] = useState<string>(firstMissing);
  const dragging = useRef<string | null>(null);

  function ratio() {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 1;
    return rect.height / rect.width;
  }

  function setFromEvent(key: string, clientX: number, clientY: number) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const yPct = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    onChange({ ...points, [key]: { x, y: yPct * (rect.height / rect.width) } });
  }

  const activeIndex = markers.findIndex((m) => m.key === active);
  const activeDef = markers[activeIndex >= 0 ? activeIndex : 0]!;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm">
        <span className="font-medium">{activeDef.label}</span>
        <p className="text-xs text-muted-foreground">{activeDef.hint} — toque na foto para marcar.</p>
      </div>

      <div
        ref={boxRef}
        className="relative w-full touch-none overflow-hidden rounded-xl border border-border"
        onPointerDown={(e) => {
          if (dragging.current) return;
          setFromEvent(active, e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          setFromEvent(dragging.current, e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          dragging.current = null;
        }}
      >
        <img src={src} alt="Foto para marcação das medidas" className="block w-full select-none" draggable={false} />
        {markers.map((m) => {
          const p = points[m.key];
          if (!p) return null;
          const topPct = (p.y / ratio()) * 100;
          return (
            <button
              key={m.key}
              type="button"
              aria-label={m.label}
              onPointerDown={(e) => {
                e.stopPropagation();
                dragging.current = m.key;
                setActive(m.key);
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (dragging.current === m.key) setFromEvent(m.key, e.clientX, e.clientY);
              }}
              onPointerUp={() => {
                dragging.current = null;
              }}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-background/70 transition-colors",
                active === m.key ? "h-6 w-6 border-primary" : "h-5 w-5 border-foreground/60",
              )}
              style={{ left: `${p.x * 100}%`, top: `${topPct}%` }}
            >
              <span className="block h-full w-full rounded-full ring-1 ring-inset ring-background" />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {markers.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setActive(m.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              active === m.key
                ? "border-primary bg-primary text-primary-foreground"
                : points[m.key]
                  ? "border-border bg-secondary text-foreground"
                  : "border-dashed border-border text-muted-foreground",
            )}
          >
            {points[m.key] ? "✓ " : ""}
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
