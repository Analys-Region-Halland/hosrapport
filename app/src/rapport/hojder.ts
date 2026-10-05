// rapport/hojder.ts: uppskattade höjder för block som inte ritats än: figurens
// platshållare före lat montering och indikatorns contain-intrinsic-size.
// Bara för att sidan inte ska hoppa; den riktiga höjden tar över när blocket
// ritats. Ägare: WP9.

import { standardHojd, tema } from "../design/tema";

/** Ungefärlig figurhöjd före montering: plattan, titel, undertitel, plotyta och fot. */
export function figurReserv(fonsterbredd: number): number {
  const mobil = fonsterbredd <= tema.brytpunkt.mobil.max;
  const marginal = mobil ? tema.matt.marginal.mobil : tema.matt.marginal.desktop;
  const luft = mobil ? tema.diagram.platta.luftMobil : tema.diagram.platta.luft;
  const bredd = Math.min(tema.matt.figur, fonsterbredd - 2 * marginal);
  // Titel, undertitel i två rader, flikar, jämför-rad och källrad med luft emellan
  const rubriker = mobil ? 9 * tema.rum[5] : 7 * tema.rum[5];
  return Math.round(2 * luft + rubriker + standardHojd(bredd - 2 * luft));
}

/** Ungefärlig höjd för hela indikatorn med stängd fördjupning: figuren och texten runt den. */
export function indikatorUppskattning(fonsterbredd: number): number {
  return figurReserv(fonsterbredd) + 4 * tema.rum[9];
}
