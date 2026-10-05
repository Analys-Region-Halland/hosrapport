// charts/karna/tooltipModell.ts: vad tooltipen visar för en aktiv period och serie
// (stilguiden 6.8). Ren funktion; Tooltip.tsx ritar modellen. Ägare: WP2.
//
// Linje med regioner: perioden, Halland, riket, fästa och lyft region med
// värde och "plats r av n", sorterade efter värde; den lyfta serien i 600.
// Sist en uppmaning: "Klicka för att visa {namn} i grafen" eller "Klicka för
// att ta bort". Linje mot förväntat: faktiskt värde, förväntat värde,
// intervallet (80 %) och status i ord.

import type { Punkt, Status } from "../../data/modell";
import { DASH, HART, kronor, period, plats, procent, tal, varde } from "../../design/format";
import { tema } from "../../design/tema";
import type { AktivPunkt } from "../register";
import type { ChartSpec, SpecSerie } from "../spec";
import { arFastbar } from "./fasta";
import { periodIndex, type Tidsaxel } from "./skalor";

export type Inmatning = "mus" | "tangent" | "peka";

export interface TooltipRad {
  serieId: string | null;
  namn: string;
  varde: string;
  plats: string | null;
  farg: string | null;      // färgprick; null = ingen prick
  fet: boolean;
}

export interface TooltipModell {
  rubrik: string;
  nyMetod: boolean;
  rader: TooltipRad[];
  noter: string[];
  uppmaning: string | null;
  live: string;             // samma innehåll som en mening, för aria-live
}

/** Seriens punkter ordnade efter periodindex i tidsaxeln. */
export type PunktIndex = Map<string, { punkt: Punkt; pos: number }[]>;

export function byggPunktIndex(spec: ChartSpec, axel: Tidsaxel): PunktIndex {
  const ut: PunktIndex = new Map();
  for (const s of spec.serier) {
    const rad: { punkt: Punkt; pos: number }[] = [];
    s.punkter?.forEach((p, pos) => {
      const i = axel.index.get(p.period.slice(0, 10));
      if (i !== undefined) rad[i] = { punkt: p, pos };
    });
    ut.set(s.id, rad);
  }
  return ut;
}

export function vardeVid(pi: PunktIndex, serieId: string, index: number): number | null {
  const v = pi.get(serieId)?.[index]?.punkt.varde;
  return v === undefined || v === null || !Number.isFinite(v) ? null : v;
}

/** Seriens färg i diagrammet (lyft kontext = kontextAktiv). */
export function serieFarg(s: SpecSerie): string {
  const r = tema.diagram.roll;
  switch (s.roll) {
    case "fokus": return r.fokus.farg;
    case "referens": return r.referens.farg;
    case "markerad": return r.markerad.farg[(s.markeringIndex ?? 0) % r.markerad.farg.length];
    case "mal": return r.mal.farg;
    default: return r.kontextAktiv.farg;
  }
}

/** Index för första perioden efter ett seriebrott, eller null. */
export function seriebrottIndex(spec: ChartSpec, axel: Tidsaxel): number | null {
  const n = spec.noter.find((x) => x.typ === "seriebrott" && x.period);
  return n?.period ? periodIndex(axel, n.period) : null;
}

/**
 * "plats r av n" för en serie vid en period, ur specens `platser` (per punkt)
 * och `platsAv` (per period). Räknas aldrig om här: R rankar på oavrundade
 * värden och kpiTillSpec bär resultatet. Saknas fälten visas ingen plats.
 */
export function platsVid(spec: ChartSpec, pi: PunktIndex, s: SpecSerie, index: number): string | null {
  const egen = pi.get(s.id)?.[index];
  if (!egen || !s.platser) return null;
  const r = s.platser[egen.pos];
  const n = spec.platsAv?.[egen.pos];
  return r != null && n != null ? plats(r, n) : null;
}

function statusOrd(s: Status): string {
  return s === "gron" ? "I fas" : s === "gul" ? "Bevaka" : "Avvikelse";
}

/** Status mot förväntat intervall: fokuspunktens signal (räknad i R, buren av kpiTillSpec). */
export function forvantatStatus(p: Punkt | undefined): Status | null {
  return p && p.varde !== null && p.signal ? p.signal : null;
}

/** Intervall i ett format: "89,1–91,3 %". */
function intervallText(lo: number, hi: number, s: ChartSpec): string {
  const f = s.y.format;
  const d = f.decimaler;
  if (f.enhet === "procent") return `${tal(lo, d)}${DASH}${procent(hi, d)}`;
  if (f.enhet === "kronor") return `${tal(lo, d)}${DASH}${kronor(hi, d)}`;
  return `${varde(lo, f)}${DASH}${varde(hi, f)}`;
}

function uppmaningVerb(satt: Inmatning): string {
  return satt === "tangent" ? "Tryck Enter" : satt === "peka" ? "Tryck igen" : "Klicka";
}

export function tooltipModell(
  spec: ChartSpec,
  axel: Tidsaxel,
  pi: PunktIndex,
  aktiv: AktivPunkt,
  satt: Inmatning = "mus",
): TooltipModell {
  const i = aktiv.index;
  const iso = axel.perioder[i];
  const rubrik = iso ? period(iso, axel.vy, "kort") : "";
  const brott = seriebrottIndex(spec, axel);
  const nyMetod = brott !== null && i >= brott;
  const fmt = (v: number | null) => varde(v, spec.y.format);
  const fokus = spec.serier.find((s) => s.roll === "fokus");
  const lyft = aktiv.serieId ? spec.serier.find((s) => s.id === aktiv.serieId) ?? null : null;
  const noter: string[] = [];
  let rader: TooltipRad[] = [];

  const forvantat = spec.serier.find((s) => s.roll === "forvantat");
  if (forvantat && fokus) {
    // Linje mot förväntat
    const p = pi.get(fokus.id)?.[i]?.punkt;
    const iv = forvantat.intervall?.find((x) => axel.index.get(x.x.slice(0, 10)) === i);
    rader.push({ serieId: fokus.id, namn: fokus.namn, varde: fmt(p?.varde ?? null), plats: null, farg: serieFarg(fokus), fet: true });
    const yhat = p?.yhat ?? (iv ? (iv.lo + iv.hi) / 2 : undefined);
    if (yhat !== undefined) rader.push({ serieId: null, namn: "Förväntat värde", varde: fmt(yhat), plats: null, farg: null, fet: false });
    if (iv) {
      const andel = Math.round(tema.diagram.roll.forvantat.intervall * 100);
      rader.push({ serieId: forvantat.id, namn: `Förväntat intervall (${andel}${HART}%)`, varde: intervallText(iv.lo, iv.hi, spec), plats: null, farg: null, fet: false });
    }
    const st = forvantatStatus(p);
    if (st) rader.push({ serieId: null, namn: "Status", varde: statusOrd(st), plats: null, farg: null, fet: false });
    // Fästa jämförelser (t.ex. sjukhus) med sina värden
    for (const s of spec.serier) {
      if (s.roll !== "markerad") continue;
      const v = vardeVid(pi, s.id, i);
      if (v !== null) rader.push({ serieId: s.id, namn: s.namn, varde: fmt(v), plats: null, farg: serieFarg(s), fet: lyft?.id === s.id });
    }
  } else {
    // Linje med regioner (eller en ensam fokusserie)
    const visas: SpecSerie[] = [];
    for (const s of spec.serier) {
      if (s.roll === "fokus" || s.roll === "referens" || s.roll === "markerad") visas.push(s);
    }
    if (lyft && !visas.includes(lyft) && lyft.punkter) visas.push(lyft);
    rader = visas
      .map((s) => ({ s, v: vardeVid(pi, s.id, i) }))
      .filter((x): x is { s: SpecSerie; v: number } => x.v !== null)
      .sort((a, b) => b.v - a.v)
      .map(({ s, v }) => ({
        serieId: s.id,
        namn: s.namn,
        varde: fmt(v),
        plats: platsVid(spec, pi, s, i),
        farg: serieFarg(s),
        fet: lyft ? s.id === lyft.id : s.roll === "fokus",
      }));
  }
  if (fokus && vardeVid(pi, fokus.id, i) === null) noter.push(`Inget värde för ${fokus.namn} ${rubrik}`);

  let uppmaning: string | null = null;
  if (lyft && arFastbar(lyft)) {
    uppmaning = lyft.roll === "markerad"
      ? `${uppmaningVerb(satt)} för att ta bort`
      : `${uppmaningVerb(satt)} för att visa ${lyft.namn} i grafen`;
  }

  const delar = rader.map((r) => `${r.namn} ${r.varde}${r.plats ? `, ${r.plats}` : ""}`);
  const live = [
    `${rubrik}${nyMetod ? " (ny metod)" : ""}: ${delar.join("; ")}.`,
    ...noter.map((n) => `${n}.`),
    ...(uppmaning ? [`${uppmaning}.`] : []),
  ].join(" ");

  return { rubrik, nyMetod, rader, noter, uppmaning, live };
}
