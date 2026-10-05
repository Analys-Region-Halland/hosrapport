// rapport/ramDisposition.ts: kapitlets disposition för innehållsförteckningen
// och positionsraden: block, avsnitt och indikatorer med nummer (stilguiden
// 4.3 och 4.5). Ren funktion av KapitelModell. Ägare: WP6.
//
// Numrering: avsnitt 1, 2, 3 …; indikatorer 2.3 (avsnitt.indikator). Ett
// kapitel utan avsnitt numrerar indikatorerna 1, 2, 3 … Blocken på
// kapitelnivå (Det viktigaste, Läget i korthet, Om statistiken) är onumrerade.
// Block utan innehåll utelämnas (stilguiden 1, princip 7).

import type { KapitelModell, Status } from "../data/modell";
import { KAPITELBLOCK } from "../nav/route";

export interface DispIndikator {
  id: string;
  nummer: string;
  namn: string;
  status: Status | null;
}

export interface DispAvsnitt {
  id: string;
  nummer: string;
  namn: string;
  indikatorer: DispIndikator[];
}

export interface DispBlock {
  id: string;
  namn: string;
}

export interface Disposition {
  kapitel: DispBlock;
  /** Block före avsnitten: Det viktigaste, Läget i korthet. */
  fore: DispBlock[];
  /** Tom när kapitlet saknar avsnitt. */
  avsnitt: DispAvsnitt[];
  /** Indikatorer direkt i kapitlet, bara när avsnitt saknas. */
  indikatorer: DispIndikator[];
  /** Block efter avsnitten: Om statistiken. */
  efter: DispBlock[];
}

export function byggDisposition(k: KapitelModell): Disposition {
  const kpier = new Map(k.kpier.map((x) => [x.id, x]));
  const indikator = (id: string, nummer: string): DispIndikator => {
    const x = kpier.get(id)!;
    return { id, nummer, namn: x.namn, status: x.status };
  };
  const avsnitt = k.avsnitt.map((a, ai) => ({
    id: a.id,
    nummer: String(ai + 1),
    namn: a.namn,
    indikatorer: a.kpi_ids.filter((id) => kpier.has(id)).map((id, ki) => indikator(id, `${ai + 1}.${ki + 1}`)),
  }));
  const indikatorer = k.avsnitt.length ? [] : k.kpier.map((x, i) => indikator(x.id, String(i + 1)));
  const fore: DispBlock[] = [];
  if (k.huvudpunkter.length) fore.push({ id: KAPITELBLOCK.viktigast, namn: "Det viktigaste" });
  if (k.kpier.length) fore.push({ id: KAPITELBLOCK.laget, namn: "Läget i korthet" });
  return {
    kapitel: { id: k.id, namn: k.namn },
    fore,
    avsnitt,
    indikatorer,
    efter: [{ id: KAPITELBLOCK.om, namn: "Om statistiken" }],
  };
}

export interface Position {
  block?: DispBlock;
  avsnitt?: DispAvsnitt;
  indikator?: DispIndikator;
}

/** Var ett block ligger i dispositionen. Tomt objekt för okänt block eller "". */
export function hittaPosition(d: Disposition, blockId: string): Position {
  if (!blockId) return {};
  const block = [...d.fore, ...d.efter].find((b) => b.id === blockId);
  if (block) return { block };
  for (const a of d.avsnitt) {
    if (a.id === blockId) return { avsnitt: a };
    const indikator = a.indikatorer.find((x) => x.id === blockId);
    if (indikator) return { avsnitt: a, indikator };
  }
  const indikator = d.indikatorer.find((x) => x.id === blockId);
  return indikator ? { indikator } : {};
}

/** Positionsradens delar, t.ex. ["2 Vårdgarantin", "2.3 Väntande till operation"].
 *  Ovanför första blocket (eller okänt block): kapitlets namn. */
export function positionsdelar(d: Disposition, blockId: string): { id: string; text: string }[] {
  const p = hittaPosition(d, blockId);
  if (p.block) return [{ id: p.block.id, text: p.block.namn }];
  const delar: { id: string; text: string }[] = [];
  if (p.avsnitt) delar.push({ id: p.avsnitt.id, text: `${p.avsnitt.nummer} ${p.avsnitt.namn}` });
  if (p.indikator) delar.push({ id: p.indikator.id, text: `${p.indikator.nummer} ${p.indikator.namn}` });
  return delar.length ? delar : [{ id: d.kapitel.id, text: d.kapitel.namn }];
}
