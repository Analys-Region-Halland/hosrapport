// ui/lager.ts: lokal stapel av öppna lager (meny, jämför-listan, dialog) så att
// Escape stänger bara det översta (stilguiden 4.5, docs/arkitektur.md 4.6).
// Ägare: WP4, tillfälligt. Samma lilla gränssnitt som nav/lager.ts (WP6,
// `oppnaLager`); när WP6 är sammanslagen ersätts innehållet här av en
// återexport därifrån, så att det bara finns en stapel och en lyssnare.
//
// Lyssnaren ligger i bubblingsfasen på document: ett element som själv hanterar
// Escape (t.ex. diagrammets tooltip) och anropar stopPropagation får företräde.

import { useEffect, useEffectEvent } from "react";

const stapel: (() => void)[] = [];
let lyssnar = false;

function vidTangent(e: KeyboardEvent): void {
  if (e.key !== "Escape" || e.isComposing || stapel.length === 0) return;
  e.preventDefault();
  e.stopPropagation();
  stapel[stapel.length - 1]();
}

/** Lägger ett lager överst. Returnerar en funktion som tar bort det. */
export function registreraLager(stang: () => void): () => void {
  const post = () => stang();
  stapel.push(post);
  if (!lyssnar && typeof document !== "undefined") {
    document.addEventListener("keydown", vidTangent);
    lyssnar = true;
  }
  return () => {
    const i = stapel.lastIndexOf(post);
    if (i >= 0) stapel.splice(i, 1);
  };
}

/** Antal öppna lager (för tester och felsökning). */
export function antalLager(): number {
  return stapel.length;
}

/** Registrerar ett lager så länge `oppen` är sant. `stang` får bytas mellan renderingar. */
export function useLager(oppen: boolean, stang: () => void): void {
  const vidStang = useEffectEvent(stang);
  useEffect(() => {
    if (!oppen) return;
    return registreraLager(() => vidStang());
  }, [oppen]);
}
