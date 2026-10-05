// rapport/nedborrning.ts: figurens läge i en indikator, nivå för nivå
// (stilguiden 6.7, WP10). Ägare: WP10. Rena funktioner utan DOM.
//
// Läget är fokusenheten (Region Halland, ett sjukhus, en avdelning …) och
// visningen (Över tid, Per sjukhus …). Det byts när läsaren väljer en flik,
// klickar på en panels namn eller en rad i enheternas rangordning (ned en nivå)
// eller på brödsmulan (upp). Läget står i adressen som v och e (nav/figurlage.ts):
//   lageFranAdress  adressen → läget, med kontroll av att enhet och visning finns
//   lageTillAdress  läget → v och e, förval utelämnade
//   giltigtLage     läget efter byte av vy eller data: ogiltigt faller tillbaka

import { visningar } from "../charts/kpiTillSpec";
import type { VisningId } from "../charts/spec";
import type { Enhet, KapitelModell, KpiModell, VyId } from "../data/modell";
import type { Figurlage } from "../nav/figurlage";
import type { Route } from "../nav/route";

export interface NivaLage {
  /** Fokusenhetens id; indikatorns fokus (Region Halland) är förval. */
  fokus: string;
  visning: VisningId;
}

/** Kedjan från indikatorns fokus (regionen) ned till enheten; tom om enheten inte ligger under den. */
function kedja(kpi: KpiModell, kap: KapitelModell, enhetId: string): Enhet[] {
  const per = new Map(kap.enheter.map((e) => [e.id, e]));
  const ut: Enhet[] = [];
  for (let e = per.get(enhetId); e && ut.length < 10; e = e.parent_id ? per.get(e.parent_id) : undefined) {
    ut.unshift(e);
    if (e.id === kpi.fokus) return ut;
  }
  return [];
}

/** Kan enheten vara fokus i indikatorn: den har en serie och ligger under regionen (eller är den). */
export function arFokusbar(kpi: KpiModell, kap: KapitelModell, enhetId: string): boolean {
  return !!kpi.serier[enhetId] && kedja(kpi, kap, enhetId).length > 0;
}

/** Brödsmulan från regionen ned till fokus (stilguiden 6.7); bara regionen när fokus är regionen. */
export function brodsmula(kpi: KpiModell, kap: KapitelModell, fokus: string): { id: string; namn: string }[] {
  const k = kedja(kpi, kap, fokus);
  return (k.length ? k : kedja(kpi, kap, kpi.fokus)).map((e) => ({ id: e.id, namn: e.namn }));
}

/** Visningarna som finns för fokus, i flikordning (WP1:s visningar). */
const visningarFor = (kpi: KpiModell, kap: KapitelModell, vy: VyId, fokus: string): VisningId[] =>
  visningar(kpi, kap, { vy, fokus }).map((v) => v.id);

/** Läget som det går att visa: fokus som finns (annars regionen) och en visning som finns där (annars den första). */
export function giltigtLage(kpi: KpiModell, kap: KapitelModell, vy: VyId, lage: NivaLage): NivaLage {
  const fokus = arFokusbar(kpi, kap, lage.fokus) ? lage.fokus : kpi.fokus;
  const finns = visningarFor(kpi, kap, vy, fokus);
  return { fokus, visning: finns.includes(lage.visning) ? lage.visning : finns[0] ?? "tid" };
}

/** Förvalt läge: regionen och första visningen. */
export function forvaltLage(kpi: KpiModell, kap: KapitelModell, vy: VyId): NivaLage {
  return giltigtLage(kpi, kap, vy, { fokus: kpi.fokus, visning: "tid" });
}

/**
 * Läget efter att fokus bytts till `enhetId` (ned genom klick, upp genom
 * brödsmulan): samma slags visning om den finns på den nya nivån, annars
 * enheterna där, annars över tid. Från "Per sjukhus" blir det alltså
 * "Per avdelning", och från en avdelning upp till sjukhuset "Över tid".
 */
export function bytFokus(kpi: KpiModell, kap: KapitelModell, vy: VyId, fore: NivaLage, enhetId: string): NivaLage {
  const fokus = arFokusbar(kpi, kap, enhetId) ? enhetId : kpi.fokus;
  const finns = visningarFor(kpi, kap, vy, fokus);
  const visning = finns.includes(fore.visning) ? fore.visning
    : fore.visning === "enheterRang" && finns.includes("enheter") ? "enheter"
      : finns[0] ?? "tid";
  return { fokus, visning };
}

/** Läget i adressen när den pekar på indikatorn (i = indikatorns id); annars förval. */
export function lageFranAdress(route: Route | null, kpi: KpiModell, kap: KapitelModell, vy: VyId): NivaLage {
  if (!route || route.sida !== "kapitel" || route.id !== kap.id || route.i !== kpi.id) return forvaltLage(kpi, kap, vy);
  return giltigtLage(kpi, kap, vy, { fokus: route.e ?? kpi.fokus, visning: route.v ?? "tid" });
}

/** Läget som v och e i adressen; förval utelämnas (regionen, första visningen). */
export function lageTillAdress(kpi: KpiModell, kap: KapitelModell, vy: VyId, lage: NivaLage): Figurlage {
  const g = giltigtLage(kpi, kap, vy, lage);
  const forsta = visningarFor(kpi, kap, vy, g.fokus)[0];
  return {
    ...(g.visning !== forsta ? { v: g.visning } : {}),
    ...(g.fokus !== kpi.fokus ? { e: g.fokus } : {}),
  };
}
