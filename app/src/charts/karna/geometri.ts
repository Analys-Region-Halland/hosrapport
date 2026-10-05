// charts/karna/geometri.ts: diagrammens fasta mått i ett ställe. Värden som
// finns i design/tema.ts hämtas därifrån; resten är prototypens mått
// (docs/referens/stilguide-granskning.html, "Tidsdiagram"). Axelraden,
// x-etikettens baslinje, kopplingslinjen, överläggets punkt, lyftradien på
// pekskärm och företrädet ligger sedan WP3 i tema.diagram. Ägare: WP2.

import { tema } from "../../design/tema";

const { rum, diagram, typ } = tema;

/** Kopplingslinjens brytpunkter räknat från sista periodens x. */
const KOPPLING = {
  start: diagram.kopplingslinje.start,
  knack: diagram.kopplingslinje.knack,
  slut: diagram.kopplingslinje.slut,
} as const;

export const GEOMETRI = {
  /** Luft ovanför översta gridlinjen (prototypens m.t). */
  marginalTopp: rum[3],
  /** Höjden under plotytan: axelstreck och x-etiketter (prototypens m.b). */
  axelrad: diagram.xAxel.hojd,
  /** x-etikettens baslinje under plotytans underkant. */
  xEtikettBaslinje: diagram.xAxel.etikettBaslinje,
  /** Tickvärdet slutar så här långt till vänster om plotytan. */
  yEtikettLuft: 10,
  /** Plotytan börjar så här långt efter bredaste tickvärdet. */
  yKolumnLuft: rum[3],
  /** Minsta högermarginal när inga etiketter står i kolumnen. */
  hogerMin: rum[2],
  /** Minsta luft mellan två x-etiketter. */
  xEtikettLuft: rum[2],
  /**
   * Kopplingslinjen från linjeslutet till etiketten (vågrät–lodrät–vågrät),
   * räknat från sista periodens x. Texten står på diagram.etikett.kolumnAvstand.
   */
  koppling: KOPPLING,
  /** Luft efter längsta etiketten innan svg:ns högerkant. */
  etikettLuftHoger: 13,
  /** Pekarytan sticker ut så här mycket utanför plotytan. */
  traffMarginal: 6,
  /**
   * Till höger når pekarytan fram till etiketternas pekarytor (kolumnavståndet
   * minus kopplingslinjens sista vågräta del), så att tooltipen inte blinkar
   * till när pekaren går från linjeslutet till en etikett.
   */
  traffHoger: diagram.etikett.kolumnAvstand - (KOPPLING.slut - KOPPLING.knack),
  /** Klippytan sticker ut så här mycket så att slutpunkter och avvikelsemarkörer (7 px) inte skärs av. */
  klippMarginal: diagram.roll.forvantat.markor + 1,
  /** Punkter i överlägget (hjälplinjens punkter för visade serier). */
  overlaggPunkt: diagram.overlaggPunkt,
  /** Tooltipen står så här långt från hjälplinjen. */
  tooltipAvstand: rum[4],
  /** Vit kant runt tillfälliga texter ovanpå linjer. */
  halo: 4,
  /** Baslinjeförskjutning som centrerar 13 px-text på ett y. */
  textMitt: 4.5,
  /** Seriebrottets streck börjar så här långt ovanför baslinjen. */
  seriebrottOver: 4,
  /** Avvikelseetikettens förskjutning från punkten. */
  avvikelseEtikett: { dx: 10, dy: 4 },
  /** Fler avvikelser än så får markörer men inga korta etiketter (stilguiden 6.8, täta serier). */
  avvikelseEtiketterMax: 8,
  /** Pekskärm: lyftradien är större än musens (WCAG 2.5.8, 24 px träffyta). */
  pekskarmLyft: diagram.traffyta.lyftPekskarm,
  /** Fokus, referens och fästa serier räknas som så här mycket närmare. */
  foretrade: diagram.traffyta.foretrade,
  /** Under denna diagrambredd: färre gridlinjer och kortade namn. */
  smal: diagram.etikett.kortaUnder,
  /** Textstorlek i diagram (typ.roll.not) och för "ny metod" och "topp 3" (typ.minsta). */
  textStorlek: typ.roll.not.storlek,
  textStorlekLiten: typ.minsta,
} as const;
