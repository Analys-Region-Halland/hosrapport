// rapport/oversikt.ts: raderna i översiktstabellen Läget i korthet, deras
// gruppering per avsnitt och sorteringen (stilguiden 5.8). Rena funktioner.
// Ägare: WP9.
//
// Standardordningen är kapitlets: avsnitt för avsnitt, indikatorerna i sin
// ordning, grupperade med avsnittets namn. Ett klick på ett kolumnhuvud
// sorterar hela tabellen på den kolumnen (utan grupper); ett nytt klick på
// samma kolumn vänder ordningen. "Indikator" återställer standardordningen.
// Saknade värden står alltid sist, och lika värden behåller standardordningen.

import type { KapitelModell, Status } from "../data/modell";
import { byggDisposition } from "./ramDisposition";
import { kapitletsPeriod, senastePeriod } from "./rapportText";

export interface OversiktRad {
  kpiId: string;
  nummer: string;
  namn: string;
  /** Avsnittet raden hör till; null i kapitel utan avsnitt. */
  grupp: { id: string; namn: string } | null;
  /** Plats i standardordningen. */
  ordning: number;
  senaste: number | null;
  /** Perioden för senaste värdet när den skiljer sig från kapitlets (ISO), annars null. */
  avvikandePeriod: string | null;
  plats: number | null;
  platsAv: number | null;
  status: Status | null;
}

export type SortKolumn = "senaste" | "plats" | "status";
export type Sortering = { kolumn: "standard" } | { kolumn: SortKolumn; fallande: boolean };

export const STANDARD: Sortering = { kolumn: "standard" };

/** Första klicket på en kolumn: högst värde, bästa plats och allvarligaste status först. */
const FORSTA_FALLANDE: Record<SortKolumn, boolean> = { senaste: true, plats: false, status: true };

/** Allvarlighet: avvikelse högst. Beskrivande mått (null) räknas som saknat värde. */
const ALLVAR: Record<Status, number> = { rod: 2, gul: 1, gron: 0 };

/** Raderna i standardordning. */
export function oversiktRader(kap: KapitelModell): OversiktRad[] {
  const d = byggDisposition(kap);
  const kpier = new Map(kap.kpier.map((k) => [k.id, k]));
  const kapPeriod = kapitletsPeriod(kap);
  const grupper = d.avsnitt.length
    ? d.avsnitt.map((a) => ({ grupp: { id: a.id, namn: a.namn }, indikatorer: a.indikatorer }))
    : [{ grupp: null, indikatorer: d.indikatorer }];
  const rader: OversiktRad[] = [];
  for (const g of grupper) {
    for (const x of g.indikatorer) {
      const k = kpier.get(x.id);
      if (!k) continue;
      const f = k.serier[k.fokus];
      const p = senastePeriod(k);
      rader.push({
        kpiId: k.id,
        nummer: x.nummer,
        namn: k.namn,
        grupp: g.grupp,
        ordning: rader.length,
        senaste: f?.senaste ?? null,
        avvikandePeriod: p && kapPeriod && p !== kapPeriod ? p : null,
        plats: f?.rank ?? null,
        platsAv: f?.rank_av ?? null,
        status: k.status,
      });
    }
  }
  return rader;
}

function nyckel(r: OversiktRad, kolumn: SortKolumn): number | null {
  switch (kolumn) {
    case "senaste": return r.senaste;
    case "plats": return r.plats;
    case "status": return r.status ? ALLVAR[r.status] : null;
  }
}

/** Raderna i vald ordning. Påverkar inte indata. */
export function sorteraRader(rader: OversiktRad[], sortering: Sortering): OversiktRad[] {
  const ut = [...rader].sort((a, b) => a.ordning - b.ordning);
  if (sortering.kolumn === "standard") return ut;
  const { kolumn, fallande } = sortering;
  return ut.sort((a, b) => {
    const x = nyckel(a, kolumn), y = nyckel(b, kolumn);
    if (x === null || y === null) return x === y ? a.ordning - b.ordning : x === null ? 1 : -1;
    return (fallande ? y - x : x - y) || a.ordning - b.ordning;
  });
}

/** Sorteringen efter ett klick på en kolumn. */
export function nastaSortering(nu: Sortering, kolumn: SortKolumn | "standard"): Sortering {
  if (kolumn === "standard") return STANDARD;
  if (nu.kolumn === kolumn) return { kolumn, fallande: !nu.fallande };
  return { kolumn, fallande: FORSTA_FALLANDE[kolumn] };
}

/** aria-sort för ett kolumnhuvud. Status: fallande allvarlighet = "descending". */
export function ariaSort(nu: Sortering, kolumn: SortKolumn | "standard"): "ascending" | "descending" | "none" {
  if (kolumn === "standard") return "none";
  if (nu.kolumn !== kolumn) return "none";
  return nu.fallande ? "descending" : "ascending";
}

export interface Grupp {
  grupp: OversiktRad["grupp"];
  rader: OversiktRad[];
}

/** Grupper per avsnitt i standardordningen; en enda grupp utan namn när tabellen är sorterad. */
export function gruppera(rader: OversiktRad[], sortering: Sortering): Grupp[] {
  const sorterade = sorteraRader(rader, sortering);
  if (sortering.kolumn !== "standard") return [{ grupp: null, rader: sorterade }];
  const ut: Grupp[] = [];
  for (const r of sorterade) {
    const sista = ut[ut.length - 1];
    if (sista && sista.grupp?.id === r.grupp?.id) sista.rader.push(r);
    else ut.push({ grupp: r.grupp, rader: [r] });
  }
  return ut;
}
