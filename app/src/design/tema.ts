// tema.ts: rapportens alla designvärden, enda källan för färger, typografi,
// avstånd, mått, brytpunkter, rörelse och diagram. Nycklarna är exakt
// tokennamnen i docs/stilguide.md (avsnitt 2, 6.3–6.5 och 6.8). CSS-variablerna
// genereras härifrån av design/tema-css.ts (virtual:tema.css).
//
// Ägare: WP0 (värden ur stilguiden). WP7 får justera värden och rapporterar det.
//
// Enheter: tal är px om inget annat står. Undantag: `radhojd`, `vikt*`, `andel`,
// `opacitet` och antal saknar enhet; `sparr` är em; `rorelse.*` är ms;
// strängar används som de står (t.ex. "34em", streckmönster "6 4").

const diagramFarg = {
  fokus: "#00664D",
  kontext: "#CDCDC7",
  kontextPunkt: "#6B716D",
  kontextAktiv: "#2F3431",
  referens: "#2F3431",
  forvantat: "#DDE3EA",
  rutnat: "#CBCBC4",
  // Axlarna i hög kontrast (2026-10-08): baslinje, axelstreck och tickvärden nästan svarta
  axel: "#1A1A1A",
  grans: "#4E5450",
  nollinje: "#1A1A1A",
  axeltext: "#1A1A1A",
  anslutning: "#8E8E89",
  // Fästa serier i denna ordning, högst fyra (stilguiden 2.2)
  markering: ["#004990", "#B35900", "#433C9D", "#895B42"],
} as const;

const status = {
  gron: { markor: "#2E7D52", text: "#1F6A43", botten: "#E8F1EC" },
  gul: { markor: "#B07A12", text: "#8A5E12", botten: "#F6ECD9" },
  rod: { markor: "#B23A2E", text: "#9A2E22", botten: "#F4E3DF" },
} as const;

const black = "#1A1A1A";

export const tema = {
  // ── 2.1–2.3 Färg ──
  farg: {
    papper: "#FBFBF9",
    yta: "#FFFFFF",
    black,
    text2: "#2F3431",
    text3: "#4E5450",
    harlinje: "#E6E6E1",
    fokus: "#00664D",
    fokusLjus: "#E9F2EE",
    fokusring: "#00664D",
    diagram: diagramFarg,
    status,
    // Placeringens ton (2026-10-08), en skala som följer statusgränserna för
    // rankade mått (I fas 1–3, Bevaka 4–7, Avvikelse 8+) och delar dem finare:
    // 1–3 grön, 4–5 gul, 6–7 bärnsten, 8–11 orange, 12–16 röd, 17+ mörkröd.
    // yta = brickans botten, text = siffran, punkt = markör och skalans segment.
    plats: {
      topp: { yta: "#D8EEDF", text: "#135634", punkt: "#22804F" },
      gul: { yta: "#FBF0CC", text: "#6B4D00", punkt: "#D9AB1F" },
      barnsten: { yta: "#FCE3BF", text: "#734300", punkt: "#E38E12" },
      orange: { yta: "#FBD9C2", text: "#80360B", punkt: "#E2672A" },
      rod: { yta: "#F7D0C9", text: "#87251B", punkt: "#C73E2E" },
      morkrod: { yta: "#EBB9B0", text: "#621510", punkt: "#94221A" },
      neutral: { yta: "#EFEFEA", text: "#2F3431", punkt: "#6B716D" },
      // Sista platsen i varje ton utom den sista (mörkröd gäller resten)
      grans: [3, 5, 7, 11, 16],
    },
  },

  // ── 2.4 Typografi ──
  typ: {
    familj: {
      serif: "'Source Serif 4 Variable', 'Source Serif 4', 'Source Serif Pro', Georgia, serif",
      sans: "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif",
    },
    // storlek = desktop, mobilstorlek = under brytpunkt.mobil
    roll: {
      titel: { familj: "serif", storlek: 44, mobilstorlek: 32, radhojd: 1.1, vikt: 700, sparr: -0.02 },
      avsnitt: { familj: "serif", storlek: 32, mobilstorlek: 26, radhojd: 1.2, vikt: 600, sparr: -0.01 },
      indikator: { familj: "serif", storlek: 24, mobilstorlek: 21, radhojd: 1.25, vikt: 600 },
      ingress: { familj: "serif", storlek: 21, mobilstorlek: 19, radhojd: 1.5, vikt: 400 },
      brod: { familj: "serif", storlek: 18, mobilstorlek: 17, radhojd: 1.6, vikt: 400 },
      figurtitel: { familj: "sans", storlek: 18, mobilstorlek: 17, radhojd: 1.3, vikt: 600 },
      granssnitt: { familj: "sans", storlek: 15, mobilstorlek: 15, radhojd: 1.45, vikt: 400, viktStark: 600 },
      not: { familj: "sans", storlek: 13, mobilstorlek: 13, radhojd: 1.4, vikt: 400, viktStark: 600 },
    },
    // Kickern ovanför titeln: typ.roll.not, 600, versal, farg.fokus
    kicker: { sparr: 0.08 },
    // Seriebrottets "ny metod" och rangordningens "topp 3"; inget annat är mindre än 13 px
    minsta: 12,
    // Siffror i sans i tabeller, nyckeltal och diagram
    siffror: "tabular-nums",
    // Länkar: understrykning 1 px (hover 2 px) med 0,2 em avstånd
    lank: { understrykning: 1, understrykningHover: 2, avstand: "0.2em" },
    // Löptextens stycken
    styckeavstand: "0.9em",
  },

  // ── 2.5 Avstånd (8-punktsrutnät) ──
  rum: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64, 9: 96, 10: 128 },

  // ── 2.5 Mått ──
  matt: {
    text: "34em",
    figur: 880,
    sida: 1320,
    toc: 220,
    verktygsrad: 56,
    harlinje: 1,
    marginal: { desktop: 24, mobil: 16 },
  },

  // ── 2.5 Brytpunkter: mobil < 640, mellan 640–1199, desktop ≥ 1200 ──
  brytpunkt: {
    mobil: { max: 639 },
    mellan: { min: 640, max: 1199 },
    desktop: { min: 1200 },
  },

  // ── 2.6 Rörelse ──
  rorelse: { kort: 120 },

  // ── 5 Komponenter: mått som stilguiden anger per komponent ──
  komponent: {
    fokusring: { bredd: 2, avstand: 2 },
    statusmarkor: { hojd: 24, sidoluft: 10, radie: 999 },
    klickyta: 24,
    menyknapp: { hojd: 36, ram: 1 },
    flik: { hojd: 32, understrykning: 2 },
    popover: { maxbredd: 320 },
    ark: { stangknapp: 44 },
    tabell: { radhojd: 44 },
    jamforLista: { radhojd: 34 },
    tocPrick: 6,
    kapitellinje: 2,
    // Statusmätaren på startsidan och i sammanfattningen (stilguiden 4.1):
    // stapelns höjd och mellanrummet mellan segmenten
    statusmatare: { hojd: 6, mellanrum: 2 },
  },

  // ── 6.3–6.5 och 6.8 Diagram ──
  diagram: {
    // Serieroller (6.4). bredd = linjebredd, streck = stroke-dasharray (null = heldragen),
    // punktradie = slutpunkt.
    roll: {
      // punktradiePeriod: en punkt per period (år) när perioderna står glest nog (punkter.minstaAvstand)
      fokus: { farg: diagramFarg.fokus, bredd: 2, streck: null, punktradie: 5, punktradieEnsam: 3, punktradiePeriod: 3.5 },
      referens: { farg: diagramFarg.referens, bredd: 1.25, streck: "5 4", punktradie: 3, punktradiePeriod: 2.25 },
      kontext: { farg: diagramFarg.kontext, bredd: 0.8, streck: null, punktradie: 0 },
      kontextAktiv: { farg: diagramFarg.kontextAktiv, bredd: 1.75, streck: null, punktradie: 3 },
      markerad: { farg: diagramFarg.markering, bredd: 1.75, streck: null, punktradie: 3.5, punktradiePeriod: 2.5 },
      forvantat: { farg: diagramFarg.forvantat, bredd: 0, streck: null, punktradie: 0, intervall: 0.8, markor: 7 },
      grans: { farg: diagramFarg.grans, bredd: 0.8, streck: null, punktradie: 0 },
      mal: { farg: black, bredd: 1, streck: "2 2", punktradie: 0 },
    },
    // Markörer utanför förväntat intervall (6.4): triangel = gul, romb = röd (95 %)
    avvikelse: { utanfor: status.gul.markor, langtUtanfor: status.rod.markor, intervallLangt: 0.95 },
    // Höjdformler (6.5): clamp(min, andel × bredd, max)
    hojd: {
      standard: { min: 300, andel: 0.62, max: 520 },
      rangordning: { rad: 24, radMobil: 22 },
      kompakt: { min: 170, andel: 0.66, max: 230 },
      minidiagram: { bredd: 96, hojd: 24 },
    },
    smaMultiplar: { tre: 760, tva: 480, maxPaneler: 12 },
    // namnMaxAndel: namnkolumnen tar högst så stor del av bredden; längre namn kortas med ellips
    rangordning: { punktradie: 4.5, fokusPunktradie: 5.5, namnMaxAndel: 0.4 },
    minidiagram: { bredd: 1.5, punktradie: 2.5 },
    // Stapel över tid (6.6): stapelbredd = breddPerMellanrum × mellanrum. Stapeln under
    // pekaren mörkas med farg.black i opaciteten morkning (6.8).
    stapel: { breddPerMellanrum: 2, morkning: 0.3 },
    // Axlar och rutnät (6.3). xAxel.hojd = raden under plotytan (axelstreck och etiketter),
    // xAxel.etikettBaslinje = etikettens baslinje under plotytans underkant.
    rutnat: { bredd: 0.8, streck: "4 4", linjerDesktop: { min: 4, max: 6 }, linjerMobil: { min: 3, max: 4 } },
    xAxel: { baslinje: 1, streckLangd: 5, hojd: 34, etikettBaslinje: 20 },
    nollinje: 1,
    seriebrott: { langd: 9, bredd: 1.5 },
    // Etiketter vid linjeslut (6.4). Kopplingslinjens brytpunkter start, knack och slut
    // räknas från sista periodens x.
    etikett: { kolumnAvstand: 21, minAvstand: 17, maxMarginalAndel: 0.34, kortaUnder: 560 },
    kopplingslinje: { bredd: 0.6, farg: diagramFarg.anslutning, start: 6, knack: 12, slut: 18 },
    // Interaktion (6.8)
    hjalplinje: { bredd: 1, opacitet: 0.35 },
    // Punkterna vid hjälplinjen: radie och vit kant
    overlaggPunkt: { radie: 4, kant: 1.5 },
    // lyftPekskarm: lyftradien på pekskärm (WCAG 2.5.8, 24 px träffyta). foretrade: fokus,
    // referens och fästa serier räknas som så här mycket närmare.
    traffyta: { lyft: 8, slapp: 14, byte: 4, lyftPekskarm: 12, foretrade: 2 },
    // Under denna diagrambredd står tooltipen under plotytan i full bredd (6.8)
    tooltip: { helBreddUnder: 560 },
    maxFasta: 4,
    platta: { luft: 24, luftMobil: 16 },
    // Punkter per period (6.4): vit kant så att punkten lossnar från rutnätet. Punkterna
    // ritas bara när perioderna står minst minstaAvstand px isär.
    punkter: { kant: 1.25, minstaAvstand: 14 },
    // Fokusseriens slutpunkt pulserar (respekterar prefers-reduced-motion); varaktighet i ms
    puls: { varaktighet: 2400, skala: 2.6 },
    // Bumpdiagrammet (6.6): fältet bakom topp 3
    bump: { topp3: "#E8F4EC" },
  },
} as const;

export type Tema = typeof tema;
export type Rollnamn = keyof Tema["typ"]["roll"];
export type StatusNyckel = keyof Tema["farg"]["status"];

/** Mediafrågor för brytpunkterna, för matchMedia och CSS-generering. */
export const mediafraga = {
  mobil: `(max-width: ${tema.brytpunkt.mobil.max}px)`,
  mellan: `(min-width: ${tema.brytpunkt.mellan.min}px) and (max-width: ${tema.brytpunkt.mellan.max}px)`,
  desktop: `(min-width: ${tema.brytpunkt.desktop.min}px)`,
} as const;

/** Standardhöjd för linje och stapel (stilguiden 6.5). */
export function standardHojd(bredd: number, h = tema.diagram.hojd.standard): number {
  return Math.round(Math.min(h.max, Math.max(h.min, h.andel * bredd)));
}

/** Panelhöjd i små multiplar (stilguiden 6.5). */
export function kompaktHojd(panelbredd: number, h = tema.diagram.hojd.kompakt): number {
  return Math.round(Math.min(h.max, Math.max(h.min, h.andel * panelbredd)));
}

/** Antal kolumner i små multiplar (stilguiden 6.5). */
export function smaMultiplarKolumner(figurbredd: number): 1 | 2 | 3 {
  const s = tema.diagram.smaMultiplar;
  return figurbredd >= s.tre ? 3 : figurbredd >= s.tva ? 2 : 1;
}
