// charts/karna/matt.ts: textbredd i px med canvas, samma typsnitt som diagrammet
// ritar med (typ.familj.sans). Utan DOM (tester, SSR) används en uppskattning
// efter IBM Plex Sans medelbredder så att layouten blir rimlig även där.
// Ägare: WP2.

import { tema } from "../../design/tema";

let ctx: CanvasRenderingContext2D | null | undefined;
const cache = new Map<string, number>();

function kontext(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx;
  ctx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
  return ctx;
}

/** Uppskattad bredd per tecken i em för Plex Sans (400). Siffror är tabulära. */
function uppskattning(text: string, storlek: number, vikt: number): number {
  let em = 0;
  for (const c of text) {
    if (/[0-9]/.test(c)) em += 0.6;
    else if (c === " " || c === " ") em += 0.25;
    else if (/[ilj.,:;'|!]/.test(c)) em += 0.26;
    else if (/[mwMW%]/.test(c)) em += 0.82;
    else if (/[A-ZÅÄÖ]/.test(c)) em += 0.64;
    else em += 0.53;
  }
  return em * storlek * (vikt >= 600 ? 1.04 : 1);
}

/** Textens bredd i px. */
export function textbredd(text: string, vikt = 400, storlek: number = tema.typ.roll.not.storlek): number {
  const nyckel = `${vikt}|${storlek}|${text}`;
  const hit = cache.get(nyckel);
  if (hit !== undefined) return hit;
  const c = kontext();
  let b: number;
  if (c) {
    c.font = `${vikt} ${storlek}px ${tema.typ.familj.sans}`;
    b = c.measureText(text).width;
  } else {
    b = uppskattning(text, storlek, vikt);
  }
  cache.set(nyckel, b);
  return b;
}

/** Tömmer mätcachen, t.ex. när typsnitten laddats klart. */
export function nollstallMatt(): void {
  cache.clear();
}

/** Kortar texten med ellips så att den ryms i `max` px. */
export function kortaText(text: string, max: number, vikt = 400, storlek: number = tema.typ.roll.not.storlek): string {
  if (textbredd(text, vikt, storlek) <= max) return text;
  const tecken = [...text];
  for (let n = tecken.length - 1; n > 0; n--) {
    const kandidat = tecken.slice(0, n).join("").trimEnd() + "…";
    if (textbredd(kandidat, vikt, storlek) <= max) return kandidat;
  }
  return "…";
}
