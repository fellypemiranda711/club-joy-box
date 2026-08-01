import { useId } from "react";
import scene from "@/assets/vision-scene.jpg";

/** Largura do corredor de visão (0-1) por opção: 1 = mais estreito, 4 = mais amplo. */
const CORRIDOR: Record<number, { width: number; top: number }> = {
  1: { width: 0.22, top: 0.55 },
  2: { width: 0.4, top: 0.48 },
  3: { width: 0.58, top: 0.4 },
  4: { width: 0.82, top: 0.3 },
};

function corridorPath(width: number, top: number) {
  const half = width / 2;
  const l = 0.5 - half;
  const r = 0.5 + half;
  return [
    "M 0.03 0.05",
    "L 0.97 0.05",
    `L 0.97 ${top.toFixed(3)}`,
    `C 0.85 ${(top + 0.15).toFixed(3)}, ${(r + 0.06).toFixed(3)} ${(top + 0.2).toFixed(3)}, ${r.toFixed(3)} 0.95`,
    `L ${l.toFixed(3)} 0.95`,
    `C ${(l - 0.06).toFixed(3)} ${(top + 0.2).toFixed(3)}, 0.15 ${(top + 0.15).toFixed(3)}, 0.03 ${top.toFixed(3)}`,
    "Z",
  ].join(" ");
}

export function VisionFieldPreview({
  tier,
  label,
  className = "",
}: {
  tier: number;
  label?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const cfg = CORRIDOR[tier] ?? CORRIDOR[1]!;
  const d = corridorPath(cfg.width, cfg.top);

  return (
    <figure className={`overflow-hidden rounded-lg border border-border bg-secondary ${className}`}>
      <div className="relative aspect-[16/10] w-full">
        <img
          src={scene}
          alt=""
          aria-hidden
          loading="lazy"
          width={1024}
          height={640}
          className="absolute inset-0 h-full w-full scale-105 object-cover blur-[6px] brightness-90"
        />
        <img
          src={scene}
          alt={`Simulação do campo de visão da opção ${tier}`}
          loading="lazy"
          width={1024}
          height={640}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `url(#vf-${id})` }}
        />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
          <defs>
            <clipPath id={`vf-${id}`} clipPathUnits="objectBoundingBox">
              <path d={d} />
            </clipPath>
          </defs>
          <path
            d={d}
            fill="none"
            stroke="white"
            strokeWidth={0.008}
            vectorEffect="non-scaling-stroke"
            opacity={0.9}
          />
        </svg>
      </div>
      {label ? (
        <figcaption className="border-t border-border bg-background px-2 py-1 text-center text-[11px] text-muted-foreground">
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}
