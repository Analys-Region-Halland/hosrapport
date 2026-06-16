/** Parsad tidsseriepunkt redo för D3 */
export interface Pt {
  d: Date;
  v: number;
  signal?: string;
  etikett?: string;
  period?: string;
}

/** Parsad prediktionsbandpunkt */
export interface BandPt {
  d: Date;
  lo: number;
  hi: number;
  lo80?: number;
  hi80?: number;
  yhat: number;
}

/** Kontextlinje (annan region) */
export interface KontextLine {
  namn: string;
  pts: Pt[];
}

/** Punkt i topp 3-zonen (grönt band — "i fas" bland regionerna) */
export interface ToppBandPt {
  d: Date;
  lo: number;
  hi: number;
}

/** All data för en panel/graf */
export interface TidsserieSeries {
  pts: Pt[];
  color: string;
  name?: string;
  band?: BandPt[];
  kontextLinjer?: KontextLine[];
  riketPts?: Pt[];
  refPts?: Pt[];
  /** Topp 3-zon bland regionerna — ritas som följsamt grönt band. */
  toppBand?: ToppBandPt[];
  /** Färg för senaste punkten (signal-färgning, t.ex. grön när i fas). */
  lastColor?: string;
  /** Målnivå — horisontell referenslinje. */
  malniva?: number;
}

export interface Margins {
  t: number;
  r: number;
  b: number;
  l: number;
}

/** Konfiguration till tidsserie() */
export interface TidsserieOpts {
  width: number;
  height: number;
  margins: Margins;
  enhet: string;
  vy?: string;
  xDomain?: [Date, Date];
  /** Explicit y-domän — delad skala över facet-paneler (t.ex. procent) */
  yDomain?: [number, number];
  /** Antal y-ticks — enhetlig etikettmängd över paneler */
  yTickCount?: number;

  // Visuella flaggor
  showTitle?: boolean;
  titleText?: string;
  titleColor?: string;
  showEndLabels?: boolean;
  /** Etikett för huvudlinjen i slutetiketterna (default "Faktiskt"). */
  mainLabel?: string;
  showBrackets?: boolean;

  // Storlek/densitet
  compact?: boolean;
  denseThreshold?: number;
  /** Sparkline-läge: ingen grid, inga axlar — bara linjen + sista punkt + hover */
  bare?: boolean;
  /** Visa bara ETT band (yttre 95 %) i stället för två — för storgrafen */
  singleBand?: boolean;

  // Formatering
  decimals?: number;
  suffix?: string;

  // Tooltip
  tooltipAccentBorder?: boolean;
}
