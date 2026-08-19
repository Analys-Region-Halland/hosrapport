import type { Manifest } from "../data/load";

// ════════════════════════════════════════════════════════════
//  vyval.ts — Vilken tidsvy en rapport öppnas i.
//
//  Regeln bor här och INGEN ANNANSTANS, eftersom två ställen är beroende
//  av den och måste vara överens:
//    ReportShell — sätter aktiv vy när rapporten öppnas.
//    StartScreen — visar antal indikatorer och statusfördelning per område.
//  Skiljer de sig åt visar omslaget andra siffror än rapporten bakom det.
//
//  Regel:
//    Ett enskilt sakområde öppnas i MÅNADSVYN när området finns där. Det är
//    den naturliga uppföljningstakten för verksamhetsnära data.
//    "Alla områden" (och områden utan månadsdata, t.ex. de årsvisa öppna
//    källorna) öppnas i den vy som innehåller FLEST områden. Annars hade
//    helhetsrapporten öppnats i en vy där bara det dygnsföljda området syns.
// ════════════════════════════════════════════════════════════

export const VY_ORDNING = ["dag", "vecka", "manad", "kvartal", "ar"] as const;
export type VyId = (typeof VY_ORDNING)[number];

export const DEFAULT_VY: VyId = "manad";

/** Tidsvyer som innehåller scope. "alla" = varje vy som finns i manifestet. */
export function giltigaVyer(manifest: Manifest, scope: string): VyId[] {
  return VY_ORDNING.filter((vy) => {
    const m = manifest[vy];
    if (!m) return false;
    return scope === "alla" || m.sektioner.some((s) => s.id === scope);
  });
}

/** Vyn rapporten öppnas i för ett scope, eller undefined om scope saknas helt. */
export function oppningsVy(manifest: Manifest, scope: string): VyId | undefined {
  const giltiga = giltigaVyer(manifest, scope);
  if (giltiga.length === 0) return undefined;
  if (scope !== "alla" && giltiga.includes(DEFAULT_VY)) return DEFAULT_VY;
  return giltiga.reduce((bast, vy) =>
    (manifest[vy]?.sektioner.length ?? 0) > (manifest[bast]?.sektioner.length ?? 0) ? vy : bast,
  );
}
