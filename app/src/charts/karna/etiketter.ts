// charts/karna/etiketter.ts: etikettkolumnen vid linjeslut (stilguiden 6.4).
// Alla etiketter står i en kolumn diagram.etikett.kolumnAvstand (21 px) till
// höger om sista perioden, minst diagram.etikett.minAvstand (17 px) isär.
// Högermarginalen växer för att rymma dem, högst maxMarginalAndel (34 %) av
// bredden; namn som inte ryms kortas med ellips (i praktiken under 560 px).
// Ägare: WP2.

import { tema } from "../../design/tema";
import { GEOMETRI } from "./geometri";
import { kortaText, textbredd } from "./matt";

export interface EtikettUnderlag {
  serieId: string;
  text: string;
  ankarY: number;           // linjeslutets y
  farg: string;
  vikt: number;
  interaktiv: boolean;
  prioritet: number;        // lägre tas bort först om kolumnen inte rymmer alla
}

export interface PlaceradEtikett extends EtikettUnderlag {
  y: number;
  kortText: string;
}

/** Största textbredd som får plats i kolumnen vid given diagrambredd. */
export function maxEtikettbredd(bredd: number): number {
  const e = tema.diagram.etikett;
  return Math.max(0, bredd * e.maxMarginalAndel - e.kolumnAvstand - GEOMETRI.etikettLuftHoger);
}

/**
 * Högermarginalen för en lista etiketter: längsta (kortade) text plus kolumnens
 * avstånd och luft, högst maxMarginalAndel av bredden.
 */
export function hogermarginal(etiketter: { text: string; vikt: number }[], bredd: number): number {
  if (etiketter.length === 0) return GEOMETRI.hogerMin;
  const e = tema.diagram.etikett;
  const max = maxEtikettbredd(bredd);
  const langst = Math.max(...etiketter.map((x) => textbredd(kortaText(x.text, max, x.vikt), x.vikt)));
  return Math.min(bredd * e.maxMarginalAndel, langst + e.kolumnAvstand + GEOMETRI.etikettLuftHoger);
}

/**
 * Placerar etiketterna lodrätt utan överlapp, så nära sina linjeslut som
 * möjligt. Klustermetod: etiketter som krockar slås ihop till block som
 * centreras kring sina linjeslut (minsta kvadratavvikelse) och hålls inom
 * [yMin, yMax]. Ryms inte alla tas de med lägst prioritet bort först.
 */
export function placeraEtiketter(
  lista: EtikettUnderlag[],
  yMin: number,
  yMax: number,
  bredd: number,
  avstand: number = tema.diagram.etikett.minAvstand,
): PlaceradEtikett[] {
  const max = maxEtikettbredd(bredd);
  let kvar = [...lista];
  const ryms = (n: number) => n <= 1 || (n - 1) * avstand <= yMax - yMin;
  while (!ryms(kvar.length)) {
    const lagst = kvar.reduce((a, b) => (b.prioritet < a.prioritet ? b : a));
    kvar = kvar.filter((e) => e !== lagst);
  }
  const sorterade = kvar.slice().sort((a, b) => a.ankarY - b.ankarY || b.prioritet - a.prioritet);

  interface Block { start: number; medlemmar: EtikettUnderlag[] }
  const ideal = (b: Block) => {
    // Bästa start: medel av (ankarY_i − i·avstånd), klämd inom gränserna
    const n = b.medlemmar.length;
    const medel = b.medlemmar.reduce((s, e, i) => s + e.ankarY - i * avstand, 0) / n;
    return Math.max(yMin, Math.min(yMax - (n - 1) * avstand, medel));
  };
  const block: Block[] = [];
  for (const e of sorterade) {
    const nytt: Block = { start: 0, medlemmar: [e] };
    nytt.start = ideal(nytt);
    block.push(nytt);
    // Slå ihop bakåt så länge blocken överlappar
    while (block.length > 1) {
      const b = block[block.length - 1];
      const a = block[block.length - 2];
      if (a.start + a.medlemmar.length * avstand <= b.start + 1e-6) break;
      a.medlemmar = a.medlemmar.concat(b.medlemmar);
      a.start = ideal(a);
      block.pop();
    }
  }
  const ut: PlaceradEtikett[] = [];
  for (const b of block) {
    b.medlemmar.forEach((e, i) => {
      ut.push({ ...e, y: b.start + i * avstand, kortText: kortaText(e.text, max, e.vikt) });
    });
  }
  return ut;
}
