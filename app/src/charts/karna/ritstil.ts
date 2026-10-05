// charts/karna/ritstil.ts: gemensamma ritattribut och små geometrihjälpare för
// SVG-delarna i former.tsx och Overlagg.tsx. Ägare: WP2.

import type { CSSProperties } from "react";
import { tema } from "../../design/tema";
import type { Etikett, LagerId } from "../register";
import { GEOMETRI } from "./geometri";

/** Ritordningen för Scen.lager. */
export const LAGERORDNING: readonly LagerId[] = ["axel", "zon", "band", "kontext", "mal", "referens", "markerad", "fokus", "punkter"];

const SIFFROR: CSSProperties = { fontVariantNumeric: tema.typ.siffror };

/** Gemensamma textattribut för diagramtext (typ.roll.not, tabulära siffror). */
export function textAttr(farg: string, vikt = 400, storlek: number = GEOMETRI.textStorlek) {
  return { fill: farg, fontFamily: tema.typ.familj.sans, fontSize: storlek, fontWeight: vikt, style: SIFFROR };
}

/** Vit kant runt text som ligger ovanpå linjer (inte under linjerna). */
export const HALO: CSSProperties = {
  ...SIFFROR,
  paintOrder: "stroke",
  stroke: tema.farg.yta,
  strokeWidth: GEOMETRI.halo,
  strokeLinejoin: "round",
};

/** Halvpixeljusterat värde för skarpa 1 px-linjer. */
export const skarp = (v: number) => Math.round(v) + 0.5;

/**
 * Kopplingslinjens bana: vågrät från linjeslutet till kolumnens knä, lodrät
 * till etikettens höjd och vågrät in mot texten. Knät och slutet räknas från
 * sista perioden (textens x minus kolumnavståndet), så en serie som slutar
 * tidigare får en längre vågrät del från sitt eget linjeslut.
 */
export function kopplingD(e: Pick<Etikett, "ankarX" | "ankarY" | "x" | "y">): string {
  const k = GEOMETRI.koppling;
  const kolumn = e.x - tema.diagram.etikett.kolumnAvstand;
  return `M${e.ankarX},${e.ankarY}H${kolumn + k.knack}V${e.y}H${kolumn + k.slut}`;
}

/** Markör för punkt utanför förväntat intervall: triangel upp/ned eller romb. */
export function markorD(form: "upp" | "ned" | "romb", x: number, y: number, s: number): string {
  const b = s * 0.86;
  if (form === "romb") return `M${x},${y - s}L${x + s},${y}L${x},${y + s}L${x - s},${y}Z`;
  if (form === "upp") return `M${x},${y - s}L${x + b},${y + s * 0.6}L${x - b},${y + s * 0.6}Z`;
  return `M${x},${y + s}L${x + b},${y - s * 0.6}L${x - b},${y - s * 0.6}Z`;
}

/** Gör ett useId-värde användbart som id i url(#…). */
export const rensaId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");
