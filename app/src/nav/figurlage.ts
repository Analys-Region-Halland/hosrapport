// nav/figurlage.ts: figurernas läge i adressen (docs/arkitektur.md 4.6, WP10).
// Ägare: WP10.
//
// En figur kan visa en annan visning (v) eller en annan fokusenhet (e) än sitt
// förval. Läget hör till blocket (indikatorn) och står i adressen bredvid
// läspositionen i: #/kapitel/akutflode?vy=manad&i=vantetid&v=enheter&e=halmstad.
//
//   - Registret: varje figur anmäler sitt läge under sitt block (anmalFigurlage)
//     och tar bort det när den försvinner. "Kopiera länk" (lankTillBlock) och
//     läspositionen (nav/useRoute.ts) tar med läget för blocket de skriver.
//   - FigurAdressKontext: ramen (rapport/Ram.tsx) ger figurerna routerns
//     tillstånd, så att de kan läsa sitt läge när sidan öppnas och följa bakåt
//     och framåt. Utanför ramen (stilguiden, tester utan DOM) finns ingen adress.

import { createContext, useContext } from "react";
import type { VisningId } from "../charts/spec";
import type { Route } from "./route";
import type { RouteTillstand } from "./useRoute";

/** En figurs läge i adressen. Förval utelämnas: ingen v för första visningen, ingen e för regionen. */
export interface Figurlage {
  v?: VisningId;
  e?: string;
}

const register = new Map<string, Figurlage>();

/** Anmäler blockets figurläge. null tar bort det (figuren försvann). */
export function anmalFigurlage(blockId: string, lage: Figurlage | null): void {
  if (lage) register.set(blockId, { ...(lage.v ? { v: lage.v } : {}), ...(lage.e ? { e: lage.e } : {}) });
  else register.delete(blockId);
}

/** Blockets anmälda figurläge, undefined om ingen figur har anmält sig. */
export function figurlage(blockId: string | undefined): Figurlage | undefined {
  return blockId ? register.get(blockId) : undefined;
}

/**
 * Adressen till blocket läsaren står vid, med figurens läge (för "Kopiera
 * länk"). Har figuren inte anmält sig och blocket är adressens eget gäller
 * adressens v och e. Andra sidor än kapitel lämnas som de är.
 */
export function lankTillBlock(route: Route, blockId: string): Route {
  if (route.sida !== "kapitel") return route;
  const i = blockId || undefined;
  const lage = figurlage(i) ?? (i && i === route.i ? { v: route.v, e: route.e } : {});
  return {
    sida: "kapitel", id: route.id, vy: route.vy,
    ...(i ? { i } : {}),
    ...(i && lage.v ? { v: lage.v } : {}),
    ...(i && lage.e ? { e: lage.e } : {}),
    ...(route.red ? { red: true } : {}),
  };
}

/** Routerns tillstånd för figurerna i rapporten; null utanför ramen. */
export const FigurAdressKontext = createContext<RouteTillstand | null>(null);

/** Adressen figuren står i, eller null när den inte står i rapportens ram. */
export function useFigurAdress(): RouteTillstand | null {
  return useContext(FigurAdressKontext);
}
