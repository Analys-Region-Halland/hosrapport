// charts/karna/skalor.ts: tidsaxel, skalor och tickregler (stilguiden 6.3).
// d3 används bara för skalor och tickberäkning. Ägare: WP2.
//
// Tidsaxeln är ett fullständigt periodrutnät från första till sista perioden
// i specen. Periodsteget (år, kvartal, månad, vecka, dag) härleds ur avståndet
// mellan perioderna. x-skalan är linjär i periodindex, så att varje period får
// samma bredd (månader ritas jämnt, som i prototypen).

import { precisionFixed, scaleLinear } from "d3";
import type { ScaleLinear } from "d3";
import type { TalFormat, VyId } from "../../data/modell";
import { kronor, period, procent, tal } from "../../design/format";
import { tema } from "../../design/tema";
import type { ChartSpec } from "../spec";
import { GEOMETRI } from "./geometri";
import { textbredd } from "./matt";

// ── Tidsaxel ──

export interface Tidsaxel {
  perioder: string[];               // ISO-datum, periodens första dag
  vy: VyId;                         // periodsteget
  index: Map<string, number>;       // period → index
}

const DAG_MS = 86_400_000;

function lasUtc(iso: string): number {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, (m || 1) - 1, d || 1);
}

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Periodsteget ur minsta avståndet mellan två perioder. */
export function hardledSteg(perioder: string[]): VyId {
  let minsta = Infinity;
  for (let i = 1; i < perioder.length; i++) {
    const d = (lasUtc(perioder[i]) - lasUtc(perioder[i - 1])) / DAG_MS;
    if (d > 0 && d < minsta) minsta = d;
  }
  if (!Number.isFinite(minsta)) return "ar";
  if (minsta >= 360) return "ar";
  if (minsta >= 85) return "kvartal";
  if (minsta >= 28) return "manad";
  if (minsta >= 7) return "vecka";
  return "dag";
}

function nastaPeriod(ms: number, vy: VyId): number {
  const d = new Date(ms);
  switch (vy) {
    case "ar": return Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate());
    case "kvartal": return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, d.getUTCDate());
    case "manad": return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    case "vecka": return ms + 7 * DAG_MS;
    case "dag": return ms + DAG_MS;
  }
}

/**
 * Fullständigt periodrutnät för de givna perioderna. Ligger perioderna inte i
 * takt med steget (oregelbunden data) används de som de är.
 */
export function periodRutnat(perioder: Iterable<string>): { perioder: string[]; vy: VyId } {
  const unika = [...new Set([...perioder].map((p) => p.slice(0, 10)))].sort();
  const vy = hardledSteg(unika);
  if (unika.length < 2) return { perioder: unika, vy };
  const slut = lasUtc(unika[unika.length - 1]);
  const rutnat: string[] = [];
  for (let t = lasUtc(unika[0]); t <= slut && rutnat.length <= 5000; t = nastaPeriod(t, vy)) rutnat.push(iso(t));
  const finns = new Set(rutnat);
  return unika.every((p) => finns.has(p)) ? { perioder: rutnat, vy } : { perioder: unika, vy };
}

/** Tidsaxeln för en spec: alla perioder i seriernas punkter och intervall. */
export function tidsaxel(spec: ChartSpec): Tidsaxel {
  const alla: string[] = [];
  for (const s of spec.serier) {
    s.punkter?.forEach((p) => alla.push(p.period));
    s.intervall?.forEach((p) => alla.push(p.x));
  }
  const { perioder, vy } = periodRutnat(alla);
  return { perioder, vy, index: new Map(perioder.map((p, i) => [p, i])) };
}

/** Periodindex för en period, eller närmast följande period i rutnätet. */
export function periodIndex(axel: Tidsaxel, p: string): number {
  const exakt = axel.index.get(p.slice(0, 10));
  if (exakt !== undefined) return exakt;
  const i = axel.perioder.findIndex((q) => q >= p.slice(0, 10));
  return i < 0 ? axel.perioder.length - 1 : i;
}

// ── Skalor ──

/** x-skala över periodindex. En ensam period hamnar mitt i plotytan. */
export function tidsskala(antal: number, x0: number, x1: number): ScaleLinear<number, number> {
  if (antal < 2) return scaleLinear().domain([0, 1]).range([(x0 + x1) / 2, (x0 + x1) / 2]);
  return scaleLinear().domain([0, antal - 1]).range([x0, x1]);
}

/** Linjär värdeskala från domän till pixlar (y växer nedåt: ange y0 > y1). */
export function linjarSkala(doman: [number, number], y0: number, y1: number): ScaleLinear<number, number> {
  return scaleLinear().domain(doman).range([y0, y1]);
}

// ── Värdeaxelns ticks ──

/** Antal gridlinjer: 4–6 i breda diagram, 3–4 i smala (stilguiden 6.3). */
const LINJER_BRED = tema.diagram.rutnat.linjerDesktop;
const LINJER_SMAL = tema.diagram.rutnat.linjerMobil;

export interface VardeTicks {
  ticks: number[];
  steg: number;
  decimaler: number;
}

/**
 * Ticks på jämna värden som omsluter datan: en gridlinje på eller över högsta
 * och på eller under lägsta värdet (stilguiden 6.3). 4–6 linjer, 3–4 i smala
 * diagram. Med `noll` ingår noll i spannet.
 *
 * Steg prövas bland 1, 2, 5 (och 25, 250 … utan decimaler) gånger en
 * tiopotens. Bland stegen som ger rätt antal linjer väljs det som slösar minst
 * höjd utanför datan, så att linjerna sitter tätt kring den.
 */
export function vardeTicks(min: number, max: number, smal: boolean, noll = false): VardeTicks {
  let lo = min, hi = max;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) { lo = 0; hi = 1; }
  if (noll) { lo = Math.min(0, lo); hi = Math.max(0, hi); }
  if (lo === hi) {
    const d = lo === 0 ? 1 : Math.abs(lo) * 0.1;
    lo -= d; hi += d;
  }
  const grans = smal ? LINJER_SMAL : LINJER_BRED;
  const e = Math.floor(Math.log10(hi - lo));
  let bast: (VardeTicks & { miss: number; spill: number; udda: boolean }) | null = null;
  for (let k = e - 2; k <= e + 1; k++) {
    for (const m of [1, 2, 2.5, 5]) {
      if (m === 2.5 && k < 1) continue;               // 2,5 bara som 25, 250 … (inga decimaler)
      const steg = m * 10 ** k;
      const t0 = Math.floor(lo / steg + 1e-9) * steg;
      const t1 = Math.ceil(hi / steg - 1e-9) * steg;
      const n = Math.round((t1 - t0) / steg) + 1;
      if (n < 2 || n > 12) continue;
      const miss = n < grans.min ? grans.min - n : n > grans.max ? n - grans.max : 0;
      const spill = (t1 - t0) - (hi - lo);
      const udda = m === 2.5;
      const battre = !bast || miss < bast.miss
        || (miss === bast.miss && (spill < bast.spill - 1e-9 || (Math.abs(spill - bast.spill) <= 1e-9 && bast.udda && !udda)));
      if (battre) {
        const decimaler = precisionFixed(steg);
        const ticks: number[] = [];
        for (let i = 0; i < n; i++) ticks.push(Number((t0 + i * steg).toFixed(decimaler + 2)));
        bast = { ticks, steg, decimaler, miss, spill, udda };
      }
    }
  }
  if (!bast) return { ticks: [lo, hi], steg: hi - lo, decimaler: 0 };
  return { ticks: bast.ticks, steg: bast.steg, decimaler: bast.decimaler };
}

/** Tickvärdets text: `%` och `kr` skrivs i ticken, andra enheter i undertiteln. */
export function tickText(v: number, format: TalFormat, decimaler: number): string {
  switch (format.enhet) {
    case "procent": return procent(v, decimaler);
    case "kronor": return kronor(v, decimaler);
    default: return tal(v, decimaler);
  }
}

// ── Tidsaxelns ticks ──

export interface TidsTick {
  index: number;
  x: number;
  text: string;
}

/** Vilka perioder som är förstahandsval för etiketter, per periodsteg. */
function forstaVal(axel: Tidsaxel): number[] {
  const ut: number[] = [];
  axel.perioder.forEach((p, i) => {
    const [a, m, d] = p.split("-").map(Number);
    switch (axel.vy) {
      case "ar": if (a % 5 === 0) ut.push(i); break;
      case "kvartal": if (m === 1) ut.push(i); break;
      case "manad": if (m === 1) ut.push(i); break;
      case "dag": if (d === 1) ut.push(i); break;
      case "vecka": {
        // Första veckan i varje kvartal (vecka 1, 14, 27, 40 ungefär)
        const fore = i > 0 ? Number(axel.perioder[i - 1].split("-")[1]) : null;
        if (fore !== null && fore !== m && (m - 1) % 3 === 0) ut.push(i);
        break;
      }
    }
  });
  return ut;
}

/**
 * Etiketter på tidsaxeln (stilguiden 6.3). År: första, vart femte och sista
 * året. Månad: januari varje år, första och sista månaden om de inte krockar;
 * kvartal och dag på samma sätt med kvartal 1 och månadens första dag.
 * Krockar förstahandsvalen glesas de ut jämnt.
 */
export function tidsTicks(axel: Tidsaxel, x: (i: number) => number): TidsTick[] {
  const n = axel.perioder.length;
  if (n === 0) return [];
  const text = (i: number) => period(axel.perioder[i], axel.vy, "axel");
  const ruta = (i: number) => {
    const b = textbredd(text(i));
    return [x(i) - b / 2, x(i) + b / 2] as const;
  };
  const krockar = (valda: number[], i: number) => {
    const [a0, a1] = ruta(i);
    return valda.some((j) => {
      const [b0, b1] = ruta(j);
      return a0 < b1 + GEOMETRI.xEtikettLuft && b0 < a1 + GEOMETRI.xEtikettLuft;
    });
  };
  const ensam = (lista: number[]) => lista.every((i, k) => k === 0 || !krockar([lista[k - 1]], i));

  const alla = forstaVal(axel);
  if (axel.vy === "ar") {
    // År: första och sista året går före vart femte år.
    const valda: number[] = [0];
    if (n > 1 && !krockar(valda, n - 1)) valda.push(n - 1);
    for (const i of alla) if (!valda.includes(i) && !krockar(valda, i)) valda.push(i);
    return valda.sort((a, b) => a - b).map((i) => ({ index: i, x: x(i), text: text(i) }));
  }
  // Övriga steg: förstahandsvalen glesas ut jämnt (var k:e, räknat bakifrån så
  // att den senaste står kvar) tills de inte krockar, sedan första och sista
  // perioden om de får plats.
  let forsta = alla;
  for (let k = 2; forsta.length > 1 && !ensam(forsta) && k <= alla.length; k++) {
    forsta = alla.filter((_, j) => (alla.length - 1 - j) % k === 0);
  }
  const valda = [...forsta];
  if (!valda.includes(0) && !krockar(valda, 0)) valda.push(0);
  if (!valda.includes(n - 1) && !krockar(valda, n - 1)) valda.push(n - 1);
  if (valda.length === 0) valda.push(n - 1);
  return valda.sort((a, b) => a - b).map((i) => ({ index: i, x: x(i), text: text(i) }));
}
