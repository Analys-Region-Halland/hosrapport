// tokenhjalp.ts: hjälpfunktioner för att visa tokens ur design/tema.ts i den
// levande stilguiden: platta ut tema-objektet, slå upp CSS-variabeln för en
// token och räkna kontrast. Ägare: WP7.

import { kontrast } from "../../src/design/kontrast";
import { tal } from "../../src/design/format";
import { tema } from "../../src/design/tema";
import { temaVariabler, temaVariablerMobil } from "../../src/design/tema-css";

/** CSS-variablerna som virtual:tema.css sätter (desktop) och de som byts på mobil. */
export const VARIABLER = temaVariabler();
export const VARIABLER_MOBIL = temaVariablerMobil();

export interface Lov {
  /** Tokenvägen, t.ex. ["farg", "diagram", "markering", "0"]. */
  sokvag: string[];
  varde: string | number | null;
}

/** Alla löv i ett tema-objekt (eller del av det) med sin tokenväg. Listor får index som nyckel. */
export function lov(objekt: unknown, sokvag: string[] = []): Lov[] {
  if (objekt === null || typeof objekt === "string" || typeof objekt === "number") {
    return [{ sokvag, varde: objekt as Lov["varde"] }];
  }
  if (Array.isArray(objekt)) return objekt.flatMap((x, i) => lov(x, [...sokvag, String(i)]));
  if (typeof objekt === "object") return Object.entries(objekt as object).flatMap(([k, x]) => lov(x, [...sokvag, k]));
  return [];
}

/** Tokennamnet som stilguiden skriver det: farg.diagram.markering[0]. */
export const tokennamn = (sokvag: string[]) =>
  sokvag.reduce((s, del) => (/^\d+$/.test(del) ? `${s}[${del}]` : s ? `${s}.${del}` : del), "");

/** CSS-variabeln för en tokenväg, om tema-css genererar en. typ.roll.X.Y heter --typ-X-Y. */
export function cssVariabel(sokvag: string[]): string | undefined {
  const vag = sokvag[0] === "typ" && sokvag[1] === "roll" ? ["typ", ...sokvag.slice(2)] : sokvag;
  const namn = `--${vag.join("-")}`;
  return namn in VARIABLER ? namn : undefined;
}

/** Värdet i en tokenväg ur tema. */
export function tokenvarde(sokvag: string[]): unknown {
  return sokvag.reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), tema);
}

/** Kontrast som text: "16,8:1". */
export const kvot = (a: string, b: string) => `${tal(kontrast(a, b), 1)}:1`;

/** Vilket WCAG-krav en kontrast klarar: text 4,5:1 (1.4.3), grafik 3:1 (1.4.11). */
export function kravText(k: number): string {
  if (k >= 4.5) return "klarar text";
  if (k >= 3) return "klarar grafik, inte text";
  return "under 3:1, bara yta eller hårfin linje";
}

/** Är värdet en hexfärg? */
export const arFarg = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);

/** Tal i svensk form med decimaler bara när de behövs: 0,8, 2,5, 24. */
export const svTal = (v: number) => tal(v, Number.isInteger(v) ? 0 : String(v).split(".")[1].length);
