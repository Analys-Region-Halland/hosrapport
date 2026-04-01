// ── Data ──

export interface TidsseriePoint {
  period: string;
  etikett: string;
  varde: number;
  /** Predikterat värde (GLM + conformal) */
  yhat?: number;
  /** 80 % conformal prediktionsintervall (inre band) */
  yhat_lower_80?: number;
  yhat_upper_80?: number;
  /** 95 % conformal prediktionsintervall (yttre band) */
  yhat_lower?: number;
  yhat_upper?: number;
  /** Tre-nivå signal: gron = inom 80 %, gul = 80–95 %, rod = utanför 95 % */
  signal?: "gron" | "gul" | "rod";
}

export interface DagarSammanfattning {
  n_dagar: number;
  n_i_fas: number;
  n_bevaka: number;
  n_avvikelse: number;
}

export interface Referens {
  period: string;
  etikett: string;
  varde: number;
  forandring: number;
}

export interface KpiData {
  id: string;
  namn: string;
  enhet: "procent" | "minuter" | "antal";
  inverterad: boolean;
  senaste: number;
  forandring: number;
  forandringar: { etikett: string; varde: number }[];
  status: "gron" | "gul" | "rod";
  analystext: string;
  /** Statistisk definition och beskrivning av indikatorn */
  beskrivning?: string;
  tidsserie: TidsseriePoint[];
  /** Dagsnivådata för senaste kompletta period */
  dagar?: TidsseriePoint[];
  /** Sammanfattning: dagar i fas vs avvikelse */
  dagar_sammanfattning?: DagarSammanfattning;
  /** Samma period föregående år */
  referens?: Referens;
  /** Referensserie — samma period föregående år (dag-vy) */
  referens_serie?: TidsseriePoint[];
  /** Kontextlinjer — andra regioner/enheter visade som gråa streck */
  kontext_serier?: KontextSerie[];
  /** Rikssnitt-serie (visas som streckad grå linje) */
  riket_serie?: { period: string; etikett: string; varde: number }[];
  /** Underkort — avdelningsnedbrytning */
  undernivaer?: SubKpi[];
}

export interface KontextSerie {
  id: string;
  namn: string;
  tidsserie: { period: string; etikett: string; varde: number }[];
}

export interface SubKpi {
  id: string;
  namn: string;
  senaste: number;
  forandring: number;
  status: "gron" | "gul" | "rod";
  tidsserie: TidsseriePoint[];
  dagar?: TidsseriePoint[];
}

export interface Section {
  id: string;
  namn: string;
  analys: string;
  kpier: KpiData[];
}

export interface DagarPeriod {
  start: string;
  slut: string;
  etikett: string;
}

export interface NastaPeriod {
  datum: string;
  etikett: string;
}

export interface VyData {
  vy: string;
  etikett: string;
  period: string;
  datum: string;
  uppdaterad: string;
  jmf_etikett: string;
  analys: string;
  /** Senaste kompletta period som visas i dag-toggle */
  dagar_period?: DagarPeriod;
  /** När nästa kompletta period är klar */
  nasta_period?: NastaPeriod;
  sektioner: Section[];
}

export type AllData = Record<string, VyData>;

// ── Kommentarer ──

export interface VComment {
  /** Nyckel: "global" | section.id | kpi.id */
  targetId: string;
  text: string;
  author: string;
  timestamp: string;
}

// ── Redigerbara innehållsblock ──

export interface ContentBlock {
  id: string;
  type: "ai" | "kommentar";
  title?: string;
  text: string;
  author?: string;
  timestamp: string;
}
