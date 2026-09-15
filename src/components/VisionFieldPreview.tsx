import { useId } from "react";
import scene from "@/assets/vision-scene-cinematic.jpg";

/**
 * Simulação cinematográfica do campo de visão de uma lente progressiva.
 * Corredor de nitidez em formato orgânico (largo em cima para longe,
 * estreito no meio, alargando embaixo para perto), marcadores de zona
 * e periferia desfocada. O nível (tier) alarga o corredor.
 */
const CORRIDOR: Record<number, { wt: number; wm: number; wb: number }> = {
  1: { wt: 0.2, wm: 0.11, wb: 0.17 },
  2: { wt: 0.28, wm: 0.18, wb: 0.25 },
  3: { wt: 0.38, wm: 0.27, wb: 0.35 },
  4: { wt: 0.48, wm: 0.4, wb: 0.46 },
};

/** Corredor orgânico: abre no topo (longe), estreita no meio, alarga na base (perto). */
function corridorPath({ wt, wm, wb }: { wt: number; wm: number; wb: number }) {
  const l = (h: number) => (0.5 - h).toFixed(3);
  const r = (h: number) => (0.5 + h).toFixed(3);
  return [
    `M ${l(wt)} 0.02`,
    `C ${l(wt)} 0.24, ${l(wm + 0.04)} 0.3, ${l(wm)} 0.45`,
    `C ${l(wm + 0.01)} 0.6, ${l(wb - 0.04)} 0.76, ${l(wb)} 0.98`,
    `L ${r(wb)} 0.98`,
    `C ${r(wb - 0.04)} 0.76, ${r(wm + 0.01)} 0.6, ${r(wm)} 0.45`,
    `C ${r(wm + 0.04)} 0.3, ${r(wt)} 0.24, ${r(wt)} 0.02`,
    "Z",
  ].join(" ");
}

const ZONES = [
  { label: "Longe", top: "16%" },
  { label: "Intermediário", top: "46%" },
  { label: "Perto", top: "76%" },
];

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
  const sharp = corridorPath(cfg);

  const maskSharp = `vf-sharp-${id}`;
  const blurFilter = `vf-blur-${id}`;

  return (
    <figure className={`overflow-hidden rounded-xl border border-border bg-foreground ${className}`}>
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {/* camada 1: cena desfocada e esmaecida (visão periférica) */}
        <img
          src={scene}
          alt=""
          aria-hidden
          loading="lazy"
          width={1280}
          height={800}
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-80 blur-lg brightness-[0.85] saturate-[0.8]"
        />
        {/* camada 2: cena nítida recortada pelo corredor da lente */}
        <img
          src={scene}
          alt={`Simulação do campo de visão da opção ${tier}`}
          loading="lazy"
          width={1280}
          height={800}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            maskImage: `url(#${maskSharp})`,
            WebkitMaskImage: `url(#${maskSharp})`,
            mask: `url(#${maskSharp})`,
          }}
        />

        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
          <defs>
            <filter id={blurFilter} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={0.022} />
            </filter>
            <mask id={maskSharp} maskContentUnits="objectBoundingBox">
              <path d={sharp} fill="white" filter={`url(#${blurFilter})`} />
            </mask>
          </defs>
        </svg>

        {/* marcadores de zona */}
        <div className="pointer-events-none absolute inset-0">
          {ZONES.map((z) => (
            <div
              key={z.label}
              className="absolute left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/25 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/75 backdrop-blur-md"
              style={{ top: z.top }}
            >
              {z.label}
            </div>
          ))}
        </div>

        {/* vinheta cinematográfica */}
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_46px_rgba(0,0,0,0.3)]" />
      </div>
      {label ? (
        <figcaption className="border-t border-border bg-background px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}
