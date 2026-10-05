// export/pptxTema.ts: rapportens designvärden (design/tema.ts) i PowerPoints
// enheter. Ägare: WP12a.
//
// Exporten har inga egna färger, typsnitt eller storlekar. Allt räknas om härifrån:
//   färger      hex utan # (pptxgenjs form), samma värden som webben
//   typsnitt    första namngivna familjen i tema-stacken som inte är en
//               webbvariant ("Source Serif 4", "IBM Plex Sans")
//   storlekar   webbens px räknas om med CSS-upplösningen 96 px per tum, så
//               att en bild på 10 tum motsvarar en sida på 960 px: 13 px blir
//               9,75 pt och 0,135 tum. Proportionerna mellan rollerna står kvar.

import { tema, type Rollnamn, type StatusNyckel } from "../design/tema";

/** CSS-upplösningen: 96 px per tum. */
export const PX_PER_TUM = 96;

/** px → tum. */
export const tum = (px: number): number => px / PX_PER_TUM;

/** px → punkter (1 px = 0,75 pt). */
export const pt = (px: number): number => (px * 72) / PX_PER_TUM;

/** En färg ur tema som pptxgenjs vill ha den: sex hexsiffror utan #, versaler. */
export function hex(farg: string): string {
  const h = farg.replace(/^#/, "").toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(h)) throw new Error(`Färgen i tema.ts går inte att använda i PowerPoint: ${farg}`);
  return h;
}

/**
 * Namnet som Office känner familjen under. Microsoft 365 hämtar IBM Plex Sans
 * och Source Serif ur sitt molnbibliotek, men Source Serif 4 (webbens version)
 * finns där bara under sitt tidigare namn Source Serif Pro. Saknas ett typsnitt
 * ersätter PowerPoint det, och med ersättningen upprepar PowerPoint ibland
 * sista ordet på en rad först på nästa (sett i PowerPoint 365 2026-10, både på
 * bilden och i PDF). Därför byts namnet här i stället för att typsnittet
 * lämnas åt ersättningen. Samma typsnitt, samma formgivare (Adobe).
 */
const OFFICE_NAMN: Readonly<Record<string, string>> = {
  "Source Serif 4": "Source Serif Pro",
};

/**
 * Familjenamnet PowerPoint ska använda ur en CSS-stack: första namngivna
 * familjen som inte är webbens variabla variant ("… Variable") eller en
 * generisk familj, med Office-namnet när det skiljer sig (OFFICE_NAMN).
 */
export function familj(stack: string): string {
  const namn = stack.split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  const generiska = new Set(["serif", "sans-serif", "system-ui", "monospace"]);
  const val = namn.find((n) => !/variable$/i.test(n) && !generiska.has(n)) ?? namn[0];
  if (!val) throw new Error(`Ingen typsnittsfamilj i ${stack}`);
  return OFFICE_NAMN[val] ?? val;
}

const d = tema.farg.diagram;

/** Alla färger exporten använder, ur tema.ts. */
export const FARG = {
  papper: hex(tema.farg.papper),
  yta: hex(tema.farg.yta),
  black: hex(tema.farg.black),
  text2: hex(tema.farg.text2),
  text3: hex(tema.farg.text3),
  harlinje: hex(tema.farg.harlinje),
  fokus: hex(tema.farg.fokus),
  fokusLjus: hex(tema.farg.fokusLjus),
  diagram: {
    fokus: hex(d.fokus),
    kontext: hex(d.kontext),
    kontextPunkt: hex(d.kontextPunkt),
    referens: hex(d.referens),
    forvantat: hex(d.forvantat),
    rutnat: hex(d.rutnat),
    grans: hex(d.grans),
    nollinje: hex(d.nollinje),
    axeltext: hex(d.axeltext),
    anslutning: hex(d.anslutning),
    markering: d.markering.map(hex),
  },
  status: Object.fromEntries(
    (Object.keys(tema.farg.status) as StatusNyckel[]).map((k) => {
      const s = tema.farg.status[k];
      return [k, { markor: hex(s.markor), text: hex(s.text), botten: hex(s.botten) }];
    }),
  ) as Record<StatusNyckel, { markor: string; text: string; botten: string }>,
} as const;

/** Alla färgvärden i FARG, för kontrollen att exporten inte har andra färger. */
export function allaFarger(): Set<string> {
  const ut = new Set<string>();
  const samla = (v: unknown) => {
    if (typeof v === "string") ut.add(v);
    else if (Array.isArray(v)) v.forEach(samla);
    else if (v && typeof v === "object") Object.values(v).forEach(samla);
  };
  samla(FARG);
  return ut;
}

export const TYPSNITT = {
  serif: familj(tema.typ.familj.serif),
  sans: familj(tema.typ.familj.sans),
} as const;

/** PowerPoints enkla radavstånd är ungefär 1,2 gånger teckenstorleken. */
const ENKELT_RADAVSTAND = 1.2;

export interface TextRoll {
  fontFace: string;
  /** Punkter. */
  fontSize: number;
  bold: boolean;
  /** Radavstånd relativt PowerPoints enkla radavstånd, så att radhöjden blir webbens. */
  lineSpacingMultiple: number;
  /** Teckenstorleken i px, för mätning med charts/karna/matt.ts. */
  px: number;
  /** En rads höjd i tum. */
  radhojd: number;
}

/** En typografisk roll ur tema.typ.roll. `stark` ger rollens starka vikt (600). */
export function roll(namn: Rollnamn, stark = false): TextRoll {
  const r = tema.typ.roll[namn];
  const vikt = stark && "viktStark" in r ? r.viktStark : r.vikt;
  return {
    fontFace: r.familj === "serif" ? TYPSNITT.serif : TYPSNITT.sans,
    fontSize: pt(r.storlek),
    bold: vikt >= 600,
    lineSpacingMultiple: Math.round((r.radhojd / ENKELT_RADAVSTAND) * 100) / 100,
    px: r.storlek,
    radhojd: tum(r.storlek * r.radhojd),
  };
}

/** Teckenstorlek i punkter för diagrammets minsta text ("topp 3", "ny metod"). */
export const MINSTA_PT = pt(tema.typ.minsta);

/** Kickerns spärr i punkter (tema.typ.kicker.sparr är em). */
export const kickerSparr = (fontSize: number): number => Math.round(tema.typ.kicker.sparr * fontSize * 100) / 100;

/** Avstånd ur rum-skalan i tum. */
export const rum = (steg: keyof typeof tema.rum): number => tum(tema.rum[steg]);

/** Linjebredd i punkter för en diagramroll (6.4). */
export const linjebredd = (px: number): number => Math.round(pt(px) * 100) / 100;

/** Textens språk, för stavningskontrollen i PowerPoint. */
export const SPRAK = "sv-SE";
