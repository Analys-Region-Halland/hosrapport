// charts/karna/etiketter.ts: etikettkolumnen vid linjeslut (stilguiden 6.4).
// Alla etiketter står i en kolumn diagram.etikett.kolumnAvstand (21 px) till
// höger om sista perioden, minst diagram.etikett.minAvstand (17 px) isär.
// Högermarginalen växer för att rymma dem, högst maxMarginalAndel (34 %) av
// bredden. Ett namn som inte ryms bryts på två rader när båda raderna ryms
// ("Förväntat" / "intervall"), annars kortas det med ellips (i praktiken
// under 560 px). Ägare: WP2.

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

export type PlaceradEtikett<T extends EtikettUnderlag = EtikettUnderlag> = T & {
  y: number;                // mitten av etiketten (en eller två rader)
  rader: string[];          // texten radbruten eller kortad
};

/** Största textbredd som får plats i kolumnen vid given diagrambredd. */
export function maxEtikettbredd(bredd: number): number {
  const e = tema.diagram.etikett;
  return Math.max(0, bredd * e.maxMarginalAndel - e.kolumnAvstand - GEOMETRI.etikettLuftHoger);
}

/** Etikettens rader: hela texten, två rader som båda ryms, eller kortad med ellips. */
export function etikettRader(text: string, max: number, vikt: number): string[] {
  if (textbredd(text, vikt) <= max) return [text];
  const ord = text.split(" ");
  let bast: string[] | null = null;
  let bastBredd = Infinity;
  for (let i = 1; i < ord.length; i++) {
    const rader = [ord.slice(0, i).join(" "), ord.slice(i).join(" ")];
    const b = Math.max(...rader.map((r) => textbredd(r, vikt)));
    if (b <= max && b < bastBredd) { bast = rader; bastBredd = b; }
  }
  return bast ?? [kortaText(text, max, vikt)];
}

/**
 * Högermarginalen för en lista etiketter: bredaste raden plus kolumnens
 * avstånd och luft, högst maxMarginalAndel av bredden.
 */
export function hogermarginal(etiketter: { text: string; vikt: number }[], bredd: number): number {
  if (etiketter.length === 0) return GEOMETRI.hogerMin;
  const e = tema.diagram.etikett;
  const max = maxEtikettbredd(bredd);
  const langst = Math.max(...etiketter.flatMap((x) => etikettRader(x.text, max, x.vikt).map((r) => textbredd(r, x.vikt))));
  return Math.min(bredd * e.maxMarginalAndel, langst + e.kolumnAvstand + GEOMETRI.etikettLuftHoger);
}

/**
 * Placerar etiketterna lodrätt utan överlapp, så nära sina linjeslut som
 * möjligt. Klustermetod: etiketter som krockar slås ihop till block som
 * centreras kring sina linjeslut (minsta kvadratavvikelse) och hålls inom
 * [yMin, yMax] (radernas mittlinjer). En etikett på två rader tar två
 * radhöjder. Ryms inte alla tas de med lägst prioritet bort först.
 */
export function placeraEtiketter<T extends EtikettUnderlag>(
  lista: T[],
  yMin: number,
  yMax: number,
  bredd: number,
  avstand: number = tema.diagram.etikett.minAvstand,
): PlaceradEtikett<T>[] {
  const max = maxEtikettbredd(bredd);
  const rader = new Map(lista.map((e) => [e, etikettRader(e.text, max, e.vikt)]));
  const h = (e: T) => (rader.get(e)?.length ?? 1) * avstand;
  let kvar = [...lista];
  const ryms = (l: T[]) => l.length <= 1 || l.reduce((s, e) => s + h(e), 0) - avstand <= yMax - yMin;
  while (!ryms(kvar)) {
    const lagst = kvar.reduce((a, b) => (b.prioritet < a.prioritet ? b : a));
    kvar = kvar.filter((e) => e !== lagst);
  }
  const sorterade = kvar.slice().sort((a, b) => a.ankarY - b.ankarY || b.prioritet - a.prioritet);

  // Ett block: medlemmar i ordning, `start` = första medlemmens mitt.
  interface Block { start: number; medlemmar: T[]; avstand: number[] }
  const forskjut = (m: T[]) => {
    const ut = [0];
    for (let i = 1; i < m.length; i++) ut.push(ut[i - 1] + (h(m[i - 1]) + h(m[i])) / 2);
    return ut;
  };
  const ideal = (b: Block) => {
    const m = b.medlemmar, off = b.avstand, n = m.length;
    const medel = m.reduce((s, e, i) => s + e.ankarY - off[i], 0) / n;
    const lo = yMin + (h(m[0]) - avstand) / 2;
    const hi = yMax - off[n - 1] - (h(m[n - 1]) - avstand) / 2;
    return Math.max(lo, Math.min(hi, medel));
  };
  const botten = (b: Block) => b.start + b.avstand[b.avstand.length - 1] + h(b.medlemmar[b.medlemmar.length - 1]) / 2;
  const topp = (b: Block) => b.start - h(b.medlemmar[0]) / 2;

  const block: Block[] = [];
  for (const e of sorterade) {
    const nytt: Block = { start: 0, medlemmar: [e], avstand: [0] };
    nytt.start = ideal(nytt);
    block.push(nytt);
    // Slå ihop bakåt så länge blocken överlappar
    while (block.length > 1) {
      const b = block[block.length - 1];
      const a = block[block.length - 2];
      if (botten(a) <= topp(b) + 1e-6) break;
      a.medlemmar = a.medlemmar.concat(b.medlemmar);
      a.avstand = forskjut(a.medlemmar);
      a.start = ideal(a);
      block.pop();
    }
  }
  const ut: PlaceradEtikett<T>[] = [];
  for (const b of block) {
    b.medlemmar.forEach((e, i) => ut.push({ ...e, y: b.start + b.avstand[i], rader: rader.get(e) ?? [e.text] }));
  }
  return ut;
}
