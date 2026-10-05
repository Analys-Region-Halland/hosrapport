// charts/karna/traff.ts: träfftest mot verkligt avstånd till linjesegmenten,
// med tröghet (stilguiden 6.8). Ägare: WP2.
//
// Regler (tema.diagram.traffyta):
//   lyft   en linje lyfts när pekaren är högst 8 px från den
//   slapp  en lyft linje släpps först när pekaren är mer än 14 px bort
//   byte   ... eller när en annan linje är minst 4 px närmare
// Fokus, referens och fästa serier får 2 px företräde (traffyta.foretrade,
// räknas som närmare).

import { tema } from "../../design/tema";
import type { Stopp } from "../register";

export interface Polylinje {
  serieId: string;
  segment: [number, number, number, number][];   // x0, y0, x1, y1
  ensamma: [number, number][];                    // punkter utan grannar som ritas
  foretrade: boolean;
}

export interface Traffregler {
  lyft: number;
  slapp: number;
  byte: number;
  foretrade: number;
}

export const STANDARDREGLER: Traffregler = {
  lyft: tema.diagram.traffyta.lyft,
  slapp: tema.diagram.traffyta.slapp,
  byte: tema.diagram.traffyta.byte,
  foretrade: tema.diagram.traffyta.foretrade,
};

/**
 * Bygger polylinjer ur seriernas pekarmål. Luckor bryter linjen; perioder
 * där ingen serie har värde (inte mätta) hoppas över, som i ritningen.
 */
export function byggPolylinjer(
  stopp: Stopp[],
  foretrade: (serieId: string) => boolean,
  ensammaRaknas: (serieId: string) => boolean,
): Polylinje[] {
  const ordning = periodOrdning(stopp);
  const perSerie = new Map<string, Stopp[]>();
  for (const s of stopp) {
    const l = perSerie.get(s.serieId);
    if (l) l.push(s); else perSerie.set(s.serieId, [s]);
  }
  const ut: Polylinje[] = [];
  for (const [serieId, lista] of perSerie) {
    lista.sort((a, b) => a.index - b.index);
    const segment: Polylinje["segment"] = [];
    const ensamma: Polylinje["ensamma"] = [];
    for (let i = 0; i < lista.length; i++) {
      const p = lista[i];
      const nasta = lista[i + 1];
      const fore = lista[i - 1];
      const iFoljd = (a: Stopp | undefined, b: Stopp | undefined) => !!a && !!b && ordning.get(b.index)! === ordning.get(a.index)! + 1;
      if (iFoljd(p, nasta)) segment.push([p.x, p.y, nasta.x, nasta.y]);
      const harGranne = iFoljd(p, nasta) || iFoljd(fore, p);
      if (!harGranne && ensammaRaknas(serieId)) ensamma.push([p.x, p.y]);
    }
    ut.push({ serieId, segment, ensamma, foretrade: foretrade(serieId) });
  }
  return ut;
}

/** Varje mätt periods plats i ordningen (perioder där någon serie har värde). */
export function periodOrdning(stopp: Stopp[]): Map<number, number> {
  const index = [...new Set(stopp.map((s) => s.index))].sort((a, b) => a - b);
  return new Map(index.map((v, i) => [v, i]));
}

/** Kortaste avståndet från en punkt till ett linjesegment. */
export function avstandTillSegment(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0, dy = y1 - y0;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

/** Kortaste avståndet från en punkt till en polylinje (segment och ensamma punkter). */
export function avstandTillLinje(p: Polylinje, px: number, py: number): number {
  let bast = Infinity;
  for (const [x0, y0, x1, y1] of p.segment) {
    const d = avstandTillSegment(px, py, x0, y0, x1, y1);
    if (d < bast) bast = d;
  }
  for (const [x, y] of p.ensamma) {
    const d = Math.hypot(px - x, py - y);
    if (d < bast) bast = d;
  }
  return bast;
}

/**
 * Väljer vilken linje som ska vara lyft när pekaren står på (px, py).
 * `nu` är den linje som är lyft nu (eller null). Returnerar serie-id eller null.
 */
export function valjLinje(
  linjer: Polylinje[],
  px: number,
  py: number,
  nu: string | null,
  regler: Traffregler = STANDARDREGLER,
): string | null {
  let bast: string | null = null;
  let bastD = Infinity;
  let nuD: number | null = null;
  for (const l of linjer) {
    const d = avstandTillLinje(l, px, py) - (l.foretrade ? regler.foretrade : 0);
    if (l.serieId === nu) nuD = d;
    if (d < bastD) { bastD = d; bast = l.serieId; }
  }
  // Tröghet: den lyfta linjen står kvar inom släppavståndet så länge ingen
  // annan linje är minst `byte` px närmare.
  if (nu !== null && nuD !== null && nuD <= regler.slapp && !(bastD <= nuD - regler.byte)) return nu;
  return bastD <= regler.lyft ? bast : null;
}
