// tema-css.ts: gör om design/tema.ts till CSS-variabler och exponerar dem som
// den virtuella modulen `virtual:tema.css` (vite-plugin, registreras i
// vite.config.ts). Innehållet är redan inslaget i `@layer tema { … }`.
//
// Namnregel (docs/arkitektur.md avsnitt 6): tokenvägen med bindestreck.
//   farg.diagram.fokus   → --farg-diagram-fokus
//   farg.fokusLjus       → --farg-fokusLjus (nycklarna skrivs som de står, bara punkt blir bindestreck)
//   farg.diagram.markering[0] → --farg-diagram-markering-0 (samma index som SpecSerie.markeringIndex)
//   typ.roll.brod        → --typ-brod-storlek, --typ-brod-radhojd, --typ-brod-vikt, --typ-brod-familj
//   rum.5                → --rum-5
// Storlekar som skiljer på mobil (typ.roll.*.mobilstorlek, matt.marginal) får en
// responsiv variabel (--typ-titel-storlek, --matt-marginal) som byts under
// brytpunkt.mobil. Gruppen `diagram` används bara från TypeScript och blir inga
// variabler (enheterna där är blandade).
//
// Ägare: WP0.

import type { Plugin } from "vite";
import { tema as standardTema, type Tema } from "./tema";

const UTAN_ENHET = new Set(["radhojd", "vikt", "viktStark"]);
const GRUPPER = ["farg", "typ", "rum", "matt", "brytpunkt", "rorelse", "komponent"] as const;

type Varde = string | number | null | undefined | readonly unknown[] | { readonly [k: string]: unknown };

function medEnhet(sokvag: string[], v: number): string {
  const nyckel = sokvag[sokvag.length - 1];
  if (sokvag[0] === "rorelse") return `${v}ms`;
  if (nyckel === "sparr") return `${v}em`;
  // Radhöjd och vikt är enhetslösa bara i typografin; komponenters radhöjd är px.
  if (UTAN_ENHET.has(nyckel) && sokvag[0] === "typ") return String(v);
  return `${v}px`;
}

function platta(sokvag: string[], v: Varde, ut: Record<string, string>): void {
  if (v === null || v === undefined) return;
  if (typeof v === "number") { ut[`--${sokvag.join("-")}`] = medEnhet(sokvag, v); return; }
  if (typeof v === "string") { ut[`--${sokvag.join("-")}`] = v; return; }
  if (Array.isArray(v)) {
    v.forEach((x, i) => {
      if (typeof x === "string" || typeof x === "number") platta([...sokvag, String(i)], x, ut);
    });
    return;
  }
  for (const [k, x] of Object.entries(v)) platta([...sokvag, k], x as Varde, ut);
}

/** Alla CSS-variabler för desktop (standardläget), som namn → värde. */
export function temaVariabler(t: Tema = standardTema): Record<string, string> {
  const ut: Record<string, string> = {};
  for (const grupp of GRUPPER) {
    if (grupp === "typ") {
      const { roll, ...ovrigt } = t.typ;
      platta(["typ"], ovrigt, ut);
      for (const [namn, r] of Object.entries(roll)) {
        const { familj, mobilstorlek: _mobil, ...varden } = r;
        ut[`--typ-${namn}-familj`] = `var(--typ-familj-${familj})`;
        platta(["typ", namn], varden, ut);
      }
      continue;
    }
    platta([grupp], t[grupp], ut);
  }
  ut["--matt-marginal"] = `${t.matt.marginal.desktop}px`;
  return ut;
}

/** Variabler som byts under brytpunkt.mobil. */
export function temaVariablerMobil(t: Tema = standardTema): Record<string, string> {
  const ut: Record<string, string> = {};
  for (const [namn, r] of Object.entries(t.typ.roll)) {
    if (r.mobilstorlek !== r.storlek) ut[`--typ-${namn}-storlek`] = `${r.mobilstorlek}px`;
  }
  ut["--matt-marginal"] = `${t.matt.marginal.mobil}px`;
  return ut;
}

const block = (v: Record<string, string>, indrag: string) =>
  Object.entries(v).map(([k, x]) => `${indrag}${k}: ${x};`).join("\n");

/** Hela innehållet i virtual:tema.css. */
export function temaCss(t: Tema = standardTema): string {
  const rorelse = Object.keys(t.rorelse).map((k) => `--rorelse-${k}`);
  return [
    "/* Genererad ur app/src/design/tema.ts av design/tema-css.ts. Ändra inte här. */",
    "@layer tema {",
    "  :root {",
    block(temaVariabler(t), "    "),
    "  }",
    `  @media (max-width: ${t.brytpunkt.mobil.max}px) {`,
    "    :root {",
    block(temaVariablerMobil(t), "      "),
    "    }",
    "  }",
    "  @media (prefers-reduced-motion: reduce) {",
    "    :root {",
    rorelse.map((k) => `      ${k}: 0ms;`).join("\n"),
    "    }",
    "  }",
    "}",
    "",
  ].join("\n");
}

const MODUL = "virtual:tema.css";
const UPPLOST = "\0virtual:tema.css";

/** Vite-plugin som exponerar `virtual:tema.css`. Vite startar om dev-servern
 *  när tema.ts ändras, eftersom filen importeras av vite.config.ts. */
export function temaCssPlugin(): Plugin {
  return {
    name: "hos-tema-css",
    resolveId(id) {
      return id === MODUL ? UPPLOST : undefined;
    },
    load(id) {
      return id === UPPLOST ? temaCss() : undefined;
    },
  };
}
