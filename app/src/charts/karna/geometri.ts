// charts/karna/geometri.ts: diagrammens fasta mått i ett ställe. Värden som
// finns i design/tema.ts hämtas därifrån; resten är prototypens mått
// (docs/referens/stilguide-granskning.html, "Tidsdiagram") och saknar ännu
// egna nycklar i tema.ts (begärt i WP2:s slutrapport). Ägare: WP2.

import { tema } from "../../design/tema";

const { rum, diagram, typ } = tema;

/** Kopplingslinjens brytpunkter räknat från sista periodens x. */
const KOPPLING = { start: 6, knack: 12, slut: 18 } as const;

export const GEOMETRI = {
  /** Luft ovanför översta gridlinjen (prototypens m.t). */
  marginalTopp: rum[3],
  /** Höjden under plotytan: axelstreck och x-etiketter (prototypens m.b). */
  axelrad: 34,
  /** x-etikettens baslinje under plotytans underkant. */
  xEtikettBaslinje: 20,
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
  overlaggPunkt: { radie: 4, kant: 1.5 },
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
  /** Fler avvikelser än så får markörer men inga korta etiketter (dag- och veckodata). */
  avvikelseEtiketterMax: 8,
  /** Pekskärm: lyftradien är större än musens (WCAG 2.5.8, 24 px träffyta). */
  pekskarmLyft: 12,
  /** Under denna diagrambredd: färre gridlinjer och kortade namn. */
  smal: diagram.etikett.kortaUnder,
  /** Textstorlek i diagram (typ.roll.not) och för "ny metod" (typ.minsta). */
  textStorlek: typ.roll.not.storlek,
  textStorlekLiten: typ.minsta,
} as const;
