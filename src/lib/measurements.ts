export type Point = { x: number; y: number };
export type FrontPoints = Record<string, Point>;
export type ProfilePoints = Record<string, Point>;

export const FRONT_MARKERS = [
  { key: "refA", label: "Cartão — canto esquerdo", hint: "Ponta esquerda da borda longa do cartão de referência" },
  { key: "refB", label: "Cartão — canto direito", hint: "Ponta direita da borda longa do cartão de referência" },
  { key: "pupilR", label: "Pupila direita", hint: "Centro da pupila do olho direito do paciente" },
  { key: "pupilL", label: "Pupila esquerda", hint: "Centro da pupila do olho esquerdo do paciente" },
  { key: "bridge", label: "Centro do nariz", hint: "Meio da ponte do nariz, entre os olhos" },
  { key: "bottomR", label: "Base da lente direita", hint: "Ponto mais baixo do aro, abaixo da pupila direita" },
  { key: "bottomL", label: "Base da lente esquerda", hint: "Ponto mais baixo do aro, abaixo da pupila esquerda" },
] as const;

export const PROFILE_MARKERS = [
  { key: "rimTop", label: "Topo do aro", hint: "Borda superior da lente, vista de perfil" },
  { key: "rimBottom", label: "Base do aro", hint: "Borda inferior da lente, vista de perfil" },
] as const;

/** Largura padrão de um cartão de crédito (ISO/IEC 7810 ID-1) em milímetros. */
export const CARD_WIDTH_MM = 85.6;

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function round(v: number) {
  return Math.round(v * 10) / 10;
}

export type FrontResult = {
  mmPerUnit: number;
  pd: number;
  dnpRight: number;
  dnpLeft: number;
  heightRight: number;
  heightLeft: number;
};

/**
 * Converte os pontos marcados na foto frontal (coordenadas normalizadas 0–1,
 * já corrigidas pela proporção da imagem) em medidas em milímetros.
 */
export function computeFront(points: FrontPoints, referenceMm = CARD_WIDTH_MM): FrontResult | null {
  const required = ["refA", "refB", "pupilR", "pupilL", "bridge", "bottomR", "bottomL"];
  if (required.some((k) => !points[k])) return null;

  const refPx = dist(points['refA']!, points['refB']!);
  if (refPx <= 0) return null;
  const mmPerUnit = referenceMm / refPx;

  return {
    mmPerUnit,
    pd: round(dist(points['pupilR']!, points['pupilL']!) * mmPerUnit),
    dnpRight: round(Math.abs(points['pupilR']!.x - points['bridge']!.x) * mmPerUnit),
    dnpLeft: round(Math.abs(points['pupilL']!.x - points['bridge']!.x) * mmPerUnit),
    heightRight: round(Math.abs(points['bottomR']!.y - points['pupilR']!.y) * mmPerUnit),
    heightLeft: round(Math.abs(points['bottomL']!.y - points['pupilL']!.y) * mmPerUnit),
  };
}

/** Ângulo pantoscópico estimado: inclinação do aro em relação à vertical. */
export function computePantoscopic(points: ProfilePoints): number | null {
  const top = points['rimTop'];
  const bottom = points['rimBottom'];
  if (!top || !bottom) return null;
  const dx = bottom.x - top.x;
  const dy = bottom.y - top.y;
  if (dy === 0) return null;
  return round(Math.abs((Math.atan2(dx, dy) * 180) / Math.PI));
}

export function isPlausible(r: FrontResult): boolean {
  return (
    r.pd >= 48 &&
    r.pd <= 78 &&
    r.heightRight >= 8 &&
    r.heightRight <= 40 &&
    r.heightLeft >= 8 &&
    r.heightLeft <= 40
  );
}

export const measurementStatusLabels: Record<string, string> = {
  pending_review: "Aguardando conferência",
  validated: "Conferida",
  rejected: "Refazer medidas",
};
