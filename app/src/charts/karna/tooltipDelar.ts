// charts/karna/tooltipDelar.ts: delar som tooltipens innehåll i rangordning,
// stapel och små multiplar delar med linjediagrammets (stilguiden 6.8):
// uppmaningens verb, skillnader med tecken och uppläsningen. Ägare: WP3.

import type { TalFormat } from "../../data/modell";
import { HART, procentenheter, tal, varde } from "../../design/format";
import type { Inmatning, TooltipRad } from "./tooltipModell";

/** Uppmaningens verb efter hur punkten valdes: "Klicka", "Tryck Enter", "Tryck igen". */
export function uppmaningVerb(satt: Inmatning, peka = "Tryck igen"): string {
  return satt === "tangent" ? "Tryck Enter" : satt === "peka" ? peka : "Klicka";
}

/** Plus före positiva tal som inte avrundas till noll. */
const medTecken = (v: number, text: string) => (v > 0 && /[1-9]/.test(text) ? `+${text}` : text);

/**
 * En skillnad i indikatorns format med tecken (stilguiden 3.2): "+1,3 p.e.",
 * "−124", "+2 350 kr", "−12 min". Procent blir procentenheter.
 */
export function skillnadText(d: number, f: Pick<TalFormat, "enhet" | "decimaler">): string {
  const text = f.enhet === "procent" ? procentenheter(d, f.decimaler) : varde(d, f);
  return medTecken(d, text);
}

/** Relativ förändring i procent med tecken: "+2,1 %". Null när basen är noll. */
export function relativText(d: number, bas: number): string | null {
  if (!bas) return null;
  const v = (100 * d) / Math.abs(bas);
  return medTecken(v, `${tal(v, 1)}${HART}%`);
}

/** Meningens punkt, utom när texten redan slutar med en (t.ex. "p.e."). */
const mening = (s: string) => (s.endsWith(".") ? s : `${s}.`);

/** Uppläsningen (aria-live): tooltipens innehåll som meningar, som i linjediagrammet. */
export function liveText(rubrik: string, rader: TooltipRad[], noter: string[], uppmaning: string | null, tillagg = ""): string {
  const delar = rader.map((r) => `${r.namn} ${r.varde}${r.plats ? `, ${r.plats}` : ""}`);
  return [
    mening(`${rubrik}${tillagg}: ${delar.join("; ")}`),
    ...noter.map(mening),
    ...(uppmaning ? [mening(uppmaning)] : []),
  ].join(" ");
}
