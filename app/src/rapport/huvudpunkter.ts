// rapport/huvudpunkter.ts: Det viktigaste för sammanfattningen och kapitlen,
// valt med regler ur kapitlens huvudpunkter (stilguiden 3.4 och 4.2). Rena
// funktioner. Ägare: WP9.
//
// Kapitlens huvudpunkter (data/normalisera.ts, senare R) står redan i
// prioritetsordning: statusbyten, bästa och sämsta placering, största rörelse.
// Sammanfattningen väljer i omgångar så att så många kapitel som möjligt kommer
// med: först varje kapitels första punkt, sedan varje kapitels andra, och så
// vidare. Ryms inte en hel omgång går punkter med riktning (positiv eller
// negativ) före neutrala, och därefter kapitlen i rapportens ordning. De valda
// punkterna visas i rapportens ordning. Under varje kapitel visas sedan nästa
// två till tre punkter, så att ingen punkt står två gånger på sidan (princip 2).

import type { Huvudpunkt, KapitelModell } from "../data/modell";
import { byggDisposition } from "./ramDisposition";

/** Högst sex punkter i Det viktigaste (stilguiden 3.4). */
export const MAX_VIKTIGAST = 6;
/** Punkter per kapitel i sammanfattningen (stilguiden 4.2: två till tre). */
export const MAX_PER_KAPITEL = 3;

export interface ValdPunkt {
  kapitelId: string;
  /** Kapitlets plats i rapporten, 0-baserad. */
  kapitelIndex: number;
  /** Punktens plats bland kapitlets huvudpunkter, 0-baserad. */
  index: number;
  punkt: Huvudpunkt;
}

const harRiktning = (p: Huvudpunkt) => p.ton !== "neutral";

/** Det viktigaste över alla kapitel: högst `max` punkter, spridda över kapitlen. */
export function valjOverKapitel(kapitel: KapitelModell[], max = MAX_VIKTIGAST): ValdPunkt[] {
  const valda: ValdPunkt[] = [];
  const langst = Math.max(0, ...kapitel.map((k) => k.huvudpunkter.length));
  for (let omgang = 0; omgang < langst && valda.length < max; omgang++) {
    const kandidater: ValdPunkt[] = kapitel.flatMap((k, kapitelIndex) => {
      const punkt = k.huvudpunkter[omgang];
      return punkt ? [{ kapitelId: k.id, kapitelIndex, index: omgang, punkt }] : [];
    });
    kandidater.sort((a, b) => Number(harRiktning(b.punkt)) - Number(harRiktning(a.punkt)) || a.kapitelIndex - b.kapitelIndex);
    valda.push(...kandidater.slice(0, max - valda.length));
  }
  return valda.sort((a, b) => a.kapitelIndex - b.kapitelIndex || a.index - b.index);
}

/** Kapitlets punkter i sammanfattningen: de som inte redan står under Det viktigaste. */
export function kapitelPunkter(kap: KapitelModell, valda: ValdPunkt[], max = MAX_PER_KAPITEL): Huvudpunkt[] {
  const tagna = new Set(valda.filter((v) => v.kapitelId === kap.id).map((v) => v.index));
  return kap.huvudpunkter.filter((_, i) => !tagna.has(i)).slice(0, max);
}

/** Indikatornummer per kpi-id i ett kapitel ("2.3"), för länkarna "se 2.3". */
export function nummerFor(kap: KapitelModell): Map<string, string> {
  const d = byggDisposition(kap);
  const ut = new Map<string, string>();
  for (const a of d.avsnitt) for (const x of a.indikatorer) ut.set(x.id, x.nummer);
  for (const x of d.indikatorer) ut.set(x.id, x.nummer);
  return ut;
}

/** Statusräkning för statusmätaren: i fas, bevaka, avvikelse. Beskrivande mått räknas inte. */
export function statusRakning(kap: KapitelModell): { gron: number; gul: number; rod: number } {
  const ut = { gron: 0, gul: 0, rod: 0 };
  for (const k of kap.kpier) if (k.status) ut[k.status]++;
  return ut;
}
