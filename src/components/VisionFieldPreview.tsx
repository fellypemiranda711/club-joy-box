import { useId } from "react";
import scene from "@/assets/vision-scene.jpg";

/**
 * Corredor de visão nítida por opção.
 * `width` = largura da zona nítida na parte de baixo (leitura),
 * `top` = onde o campo começa a estreitar, `feather` = suavidade da borda.
 */
const CORRIDOR: Record<number, { width: number; top: number; feather: number }> = {
  1: { width: 0.2, top: 0.52, feather: 0.03 },
  2: { width: 0.38, top: 0.46, feather: 0.028 },
  3: { width: 0.58, top: 0.38, feather: 0.024 },
  4: { width: 0.84, top: 0.28, feather: 0.02 },
};

function corridorPath(width: number, top: number) {
  const half = width / 2;
  const l = 0.5 - half;
  const r = 0.5 + half;
  return [
    "M 0.02 0.03",
    "L 0.98 0.03",
    `L 0.98 ${top.toFixed(3)}`,
    `C 0.88 ${(top + 0.12).toFixed(3)}, ${(r + 0.08).toFixed(3)} ${(top + 0.22).toFixed(3)}, ${r.toFixed(3)} 0.97`,
    `L ${l.toFixed(3)} 0.97`,
    `C ${(l - 0.08).toFixed(3)} ${(top + 0.22).toFixed(3)}, 0.12 ${(top + 0.12).toFixed(3)}, 0.02 ${top.toFixed(3)}`,
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
  const sharp = corridorPath(cfg.width, cfg.top);
  // corredor intermediário: um pouco mais largo, para o desfoque ir em degradê
  const mid = corridorPath(Math.min(cfg.width + 0.22, 0.95), Math.max(cfg.top - 0.08, 0.16));

  const maskSharp = `vf-sharp-${id}`;
  const maskMid = `vf-mid-${id}`;
  const blurFilter = `vf-blur-${id}`;

  return (
    <figure className={`overflow-hidden rounded-lg border border-border bg-secondary ${className}`}>
      <div className="relative aspect-[16/10] w-full">
        {/* camada 1: cena totalmente desfocada (periferia) */}
        <img
          src={scene}
          alt=""
          aria-hidden
          loading="lazy"
          width={1024}
          height={640}
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-[10px] brightness-[0.92] saturate-[0.9]"
        />
        {/* camada 2: desfoque médio dentro do corredor ampliado, com borda suave */}
        <img
          src={scene}
          alt=""
          aria-hidden
          loading="lazy"
          width={1024}
          height={640}
          className="absolute inset-0 h-full w-full scale-[1.03] object-cover blur-[4px] brightness-[0.96]"
          style={{ maskImage: `url(#${maskMid})`, WebkitMaskImage: `url(#${maskMid})`, mask: `url(#${maskMid})` }}
        />
        {/* camada 3: cena nítida no campo de visão */}
        <img
          src={scene}
          alt={`Simulação do campo de visão da opção ${tier}`}
          loading="lazy"
          width={1024}
          height={640}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ maskImage: `url(#${maskSharp})`, WebkitMaskImage: `url(#${maskSharp})`, mask: `url(#${maskSharp})` }}
        />

        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
          <defs>
            <filter id={blurFilter} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={cfg.feather} />
            </filter>
            <mask id={maskSharp} maskContentUnits="objectBoundingBox">
              <path d={sharp} fill="white" filter={`url(#${blurFilter})`} />
            </mask>
            <mask id={maskMid} maskContentUnits="objectBoundingBox">
              <path d={mid} fill="white" filter={`url(#${blurFilter})`} />
            </mask>
          </defs>
          <path
            d={sharp}
            fill="none"
            stroke="white"
            strokeOpacity={0.85}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
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
