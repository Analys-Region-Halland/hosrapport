// charts/karna/interaktion.ts: interaktionslagrets regler som rena funktioner
// (stilguiden 6.8). Diagram.tsx kopplar dem till pekar- och tangenthändelser.
// Ägare: WP2.
//
//   Mus        hovra: period under pekaren, linje inom 8 px lyfts (tröghet i
//              traff.ts); klick på lyft fästbar linje eller dess etikett fäster
//              eller tar bort.
//   Tangenter  ← → mellan perioder, Home/End, ↑ ↓ växlar serie (Halland,
//              riket, fästa, sedan övriga efter värde), Enter fäster, Escape stänger.
//   Pekskärm   tryck visar, tryck igen på samma linje fäster, tryck utanför stänger.

import type { AktivPunkt, Scen, Stopp } from "../register";
import type { ChartSpec, SpecSerie } from "../spec";
import { GEOMETRI } from "./geometri";
import { arFastbar } from "./fasta";
import { byggPolylinjer, STANDARDREGLER, valjLinje, type Polylinje, type Traffregler } from "./traff";

export interface Traffmodell {
  perioder: { index: number; x: number }[];   // perioder med minst ett värde, i ordning
  linjer: Polylinje[];
  stoppPerSerie: Map<string, Stopp[]>;          // per serie, i periodordning
  plot: Scen["plot"];
  bredd: number;
}

export function byggTraffmodell(scen: Scen, spec: ChartSpec): Traffmodell {
  const roll = new Map(spec.serier.map((s) => [s.id, s.roll]));
  const foretrade = (id: string) => {
    const r = roll.get(id);
    return r === "fokus" || r === "referens" || r === "markerad";
  };
  const linjer = byggPolylinjer(scen.stopp, foretrade, (id) => roll.get(id) !== "kontext");
  const stoppPerSerie = new Map<string, Stopp[]>();
  const perIndex = new Map<number, number>();
  for (const s of scen.stopp) {
    const l = stoppPerSerie.get(s.serieId);
    if (l) l.push(s); else stoppPerSerie.set(s.serieId, [s]);
    perIndex.set(s.index, s.x);
  }
  for (const l of stoppPerSerie.values()) l.sort((a, b) => a.index - b.index);
  const perioder = [...perIndex].map(([index, x]) => ({ index, x })).sort((a, b) => a.index - b.index);
  return { perioder, linjer, stoppPerSerie, plot: scen.plot, bredd: scen.bredd };
}

/** Om pekaren står i plotytan (med lite marginal), där hovring gäller. */
export function iPlotytan(m: Traffmodell, px: number, py: number): boolean {
  const g = GEOMETRI.traffMarginal;
  const { plot } = m;
  return px >= plot.x - g && px <= plot.x + plot.b + GEOMETRI.traffHoger && py >= 0 && py <= plot.y + plot.h + g;
}

/** Närmaste period (med värden) till pekarens x. */
export function narmastePeriod(m: Traffmodell, px: number): number | null {
  const p = m.perioder;
  if (p.length === 0) return null;
  let lo = 0, hi = p.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (p[mid].x < px) lo = mid; else hi = mid;
  }
  return Math.abs(p[lo].x - px) <= Math.abs(p[hi].x - px) ? p[lo].index : p[hi].index;
}

/** Ny aktiv punkt när pekaren står på (px, py). `nu` ger trögheten. */
export function pekarlage(
  m: Traffmodell,
  px: number,
  py: number,
  nu: AktivPunkt | null,
  regler: Traffregler = STANDARDREGLER,
): AktivPunkt | null {
  const index = narmastePeriod(m, px);
  if (index === null) return null;
  return { index, serieId: valjLinje(m.linjer, px, py, nu?.serieId ?? null, regler) };
}

/** Lyftradien på pekskärm: större än musens så att linjen går att träffa med fingret. */
export const PEKSKARMSREGLER: Traffregler = {
  ...STANDARDREGLER,
  lyft: GEOMETRI.pekskarmLyft,
  slapp: Math.max(STANDARDREGLER.slapp, GEOMETRI.pekskarmLyft),
};

/** Sista perioden med värde för fokusserien, annars sista perioden med något värde. */
export function startlage(m: Traffmodell, spec: ChartSpec): AktivPunkt | null {
  const fokus = spec.serier.find((s) => s.roll === "fokus");
  const f = fokus ? m.stoppPerSerie.get(fokus.id) : undefined;
  const index = f?.length ? f[f.length - 1].index : m.perioder[m.perioder.length - 1]?.index;
  if (index === undefined) return null;
  return { index, serieId: fokus && f?.length ? fokus.id : null };
}

/** Seriernas ordning för ↑ ↓: Halland, riket, fästa, sedan övriga efter värde. */
export function serieordning(m: Traffmodell, spec: ChartSpec, index: number): string[] {
  const varde = (s: SpecSerie) => m.stoppPerSerie.get(s.id)?.find((x) => x.index === index)?.varde ?? null;
  const roll = (r: SpecSerie["roll"]) => spec.serier.filter((s) => s.roll === r && m.stoppPerSerie.has(s.id));
  const markerade = roll("markerad").sort((a, b) => (a.markeringIndex ?? 0) - (b.markeringIndex ?? 0));
  const ovriga = roll("kontext")
    .map((s) => ({ s, v: varde(s) }))
    .filter((x): x is { s: SpecSerie; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v)
    .map((x) => x.s);
  return [...roll("fokus"), ...roll("referens"), ...markerade, ...ovriga].map((s) => s.id);
}

export interface Tangentutfall {
  hanterad: boolean;
  aktiv: AktivPunkt | null;
  vaxla?: string;           // serie-id att fästa eller ta bort
}

/** Tangentbordets regler. Okända tangenter lämnas ohanterade. */
export function tangent(
  nyckel: string,
  m: Traffmodell,
  spec: ChartSpec,
  aktiv: AktivPunkt | null,
): Tangentutfall {
  const start = aktiv ?? startlage(m, spec);
  if (!start) return { hanterad: false, aktiv };
  const perioder = m.perioder.map((p) => p.index);
  const pos = Math.max(0, perioder.indexOf(start.index));
  switch (nyckel) {
    case "ArrowRight":
    case "ArrowLeft": {
      const ny = Math.max(0, Math.min(perioder.length - 1, pos + (nyckel === "ArrowRight" ? 1 : -1)));
      return { hanterad: true, aktiv: { index: perioder[ny], serieId: start.serieId } };
    }
    case "Home":
    case "End":
      return { hanterad: true, aktiv: { index: nyckel === "Home" ? perioder[0] : perioder[perioder.length - 1], serieId: start.serieId } };
    case "ArrowDown":
    case "ArrowUp": {
      const ordning = serieordning(m, spec, start.index);
      if (ordning.length === 0) return { hanterad: true, aktiv: start };
      const i = ordning.indexOf(start.serieId ?? "");
      const steg = nyckel === "ArrowDown" ? 1 : -1;
      const ny = i < 0 ? 0 : (i + steg + ordning.length) % ordning.length;
      return { hanterad: true, aktiv: { index: start.index, serieId: ordning[ny] } };
    }
    case "Enter": {
      const s = start.serieId ? spec.serier.find((x) => x.id === start.serieId) : undefined;
      if (s && arFastbar(s)) return { hanterad: true, aktiv: start, vaxla: s.id };
      return { hanterad: aktiv !== null, aktiv: start };
    }
    case "Escape":
      return { hanterad: aktiv !== null, aktiv: null };
    default:
      return { hanterad: false, aktiv };
  }
}
