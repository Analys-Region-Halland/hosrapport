// rapport/radUtveckling.ts: utvecklingen bakom en rad i Läget i korthet och
// radens hovringskort. Rena funktioner. Tillägg 2026-10-08.
//
// - Förändringen räknas mot föregående period med värde för fokusenheten
//   (för årsdata föregående år), och står inom parentes efter värdet.
// - Platsen per period räknas bland regionerna med värde den perioden, med
//   indikatorns riktning (lågt är bäst när riktningen är "lag", annars högt).
//   Lika värden delar plats (1, 2, 2, 4). Senaste periodens plats tas från R
//   när den finns, så att tabellen och figuren alltid visar samma plats.

import type { KapitelModell, KpiModell, Punkt } from "../data/modell";
import { RIKET_ID } from "../data/modell";
import { MINUS, tal } from "../design/format";
import { tema } from "../design/tema";

/** Placeringens ton (tema.farg.plats), från grön till mörkröd, eller neutral. */
export type PlatsTon = "topp" | "gul" | "barnsten" | "orange" | "rod" | "morkrod" | "neutral";

/** Tonerna i ordning från bäst till sämst. */
export const PLATSTONER = ["topp", "gul", "barnsten", "orange", "rod", "morkrod"] as const;

/**
 * Tonen för en plats. Gränserna följer statusen för rankade mått (I fas 1–3,
 * Bevaka 4–7, Avvikelse 8+) och är absoluta, som statusen: 1–3, 4–5, 6–7,
 * 8–11, 12–16, 17+. Mått utan riktning är neutrala.
 */
export function platsTon(plats: number, riktning: KpiModell["riktning"]): PlatsTon {
  if (riktning === "neutral") return "neutral";
  const i = tema.farg.plats.grans.findIndex((g) => plats <= g);
  return PLATSTONER[i < 0 ? PLATSTONER.length - 1 : i];
}

export interface Periodvarde {
  period: string;
  varde: number;
}

export interface Periodplats {
  period: string;
  plats: number;
  av: number;
}

export interface RadUtveckling {
  /** Fokusenhetens värden över tid (perioder utan värde utelämnade). */
  serie: Periodvarde[];
  /** Riket över tid, när riket finns i indikatorn. */
  riket: Periodvarde[];
  /** Platsen bland regionerna över tid; tom för mått utan jämförelse. */
  platser: Periodplats[];
  /**
   * Lägsta och högsta värdet bland regionerna (och fokus) under fokus perioder,
   * minigrafens värdeskala, så att utvecklingen syns i proportion till
   * skillnaderna mellan regionerna, som i den stora grafen.
   */
  spann: [number, number] | null;
  senaste: Periodvarde | null;
  /** Föregående period med värde och förändringen dit. */
  foreg: Periodvarde | null;
  forandring: number | null;
  /** Platsen senaste och föregående period med plats. */
  plats: Periodplats | null;
  foregPlats: Periodplats | null;
  /** Platser bättre (+) eller sämre (−) än föregående period. */
  platsForandring: number | null;
  /** Förändringen åt det önskade hållet (true), åt fel håll (false), eller utan riktning (null). */
  battre: boolean | null;
}

const medVarde = (p: Punkt[]): Periodvarde[] =>
  p.filter((x) => x.varde !== null && Number.isFinite(x.varde)).map((x) => ({ period: x.period.slice(0, 10), varde: x.varde as number }));

/** Platsen för `id` bland `varden` med indikatorns riktning; lika värden delar plats. */
function platsBland(varden: Map<string, number>, id: string, lagBast: boolean): number | null {
  const v = varden.get(id);
  if (v === undefined) return null;
  let battre = 0;
  for (const [annan, x] of varden) if (annan !== id && (lagBast ? x < v : x > v)) battre++;
  return battre + 1;
}

/** Utvecklingen för en indikators fokusenhet. */
export function radUtveckling(kpi: KpiModell, kap: KapitelModell): RadUtveckling {
  const fokus = kpi.serier[kpi.fokus];
  const serie = medVarde(fokus?.tidsserie ?? []);
  const riketSerie = kpi.fokus !== RIKET_ID ? kpi.serier[RIKET_ID] : undefined;
  const riket = medVarde(riketSerie?.tidsserie ?? []);

  // Värdeskalans spann: alla regioner under fokus perioder
  let spann: [number, number] | null = null;
  if (serie.length) {
    const perioder = new Set(serie.map((p) => p.period));
    const regionIds = new Set(kap.enheter.filter((e) => e.niva === "region").map((e) => e.id));
    regionIds.add(kpi.fokus);
    let lo = Infinity, hi = -Infinity;
    for (const [id, s] of Object.entries(kpi.serier)) {
      if (!regionIds.has(id)) continue;
      for (const p of s.tidsserie) {
        if (p.varde === null || !Number.isFinite(p.varde) || !perioder.has(p.period.slice(0, 10))) continue;
        if (p.varde < lo) lo = p.varde;
        if (p.varde > hi) hi = p.varde;
      }
    }
    if (lo <= hi) spann = [lo, hi];
  }

  // Platser per period bland regionerna (bara när fokus har en plats från R)
  const platser: Periodplats[] = [];
  if (fokus?.rank != null && kpi.riktning !== "neutral") {
    const regioner = new Set(kap.enheter.filter((e) => e.niva === "region").map((e) => e.id));
    const perPeriod = new Map<string, Map<string, number>>();
    for (const [id, s] of Object.entries(kpi.serier)) {
      if (!regioner.has(id)) continue;
      for (const p of s.tidsserie) {
        if (p.varde === null || !Number.isFinite(p.varde)) continue;
        const nyckel = p.period.slice(0, 10);
        let m = perPeriod.get(nyckel);
        if (!m) { m = new Map(); perPeriod.set(nyckel, m); }
        m.set(id, p.varde);
      }
    }
    for (const { period } of serie) {
      const m = perPeriod.get(period);
      if (!m || m.size < 2) continue;
      const plats = platsBland(m, kpi.fokus, kpi.riktning === "lag");
      if (plats !== null) platser.push({ period, plats, av: m.size });
    }
    // Senaste perioden: R:s plats gäller
    const sista = platser[platser.length - 1];
    if (sista && serie.length && sista.period === serie[serie.length - 1].period && fokus.rank_av) {
      platser[platser.length - 1] = { period: sista.period, plats: fokus.rank, av: fokus.rank_av };
    }
  }

  const senaste = serie[serie.length - 1] ?? null;
  const foreg = serie.length > 1 ? serie[serie.length - 2] : null;
  const forandring = senaste && foreg ? senaste.varde - foreg.varde : null;
  const plats = platser[platser.length - 1] ?? null;
  const foregPlats = platser.length > 1 ? platser[platser.length - 2] : null;
  const platsForandring = plats && foregPlats ? foregPlats.plats - plats.plats : null;
  const battre = forandring === null || forandring === 0 || kpi.riktning === "neutral"
    ? null
    : (forandring > 0) === (kpi.riktning === "hog");

  return { serie, riket, platser, spann, senaste, foreg, forandring, plats, foregPlats, platsForandring, battre };
}

/** "+1,1" eller "−0,4" i värdets format men utan enhet. */
export function forandringText(v: number, kpi: KpiModell): string {
  const d = kpi.format.decimaler;
  if (Math.abs(v) < 0.5 * 10 ** -d) return "±0";
  return v > 0 ? `+${tal(v, d)}` : `${MINUS}${tal(-v, d)}`;
}
