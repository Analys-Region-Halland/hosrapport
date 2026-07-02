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
  /** Kort, status-härledd rubrik för AI-analysen (genereras i R; faller
   *  tillbaka på analysRubrik() i frontend om fältet saknas). */
  analys_rubrik?: string;
  /** Statistisk definition och beskrivning av indikatorn */
  beskrivning?: string;
  /** Målnivå — ritas som horisontell referenslinje i grafen. */
  malniva?: number;
  /** Placering bland regionerna senaste året (ranking-indikatorer, t.ex. SKR). */
  rank?: number;
  /** Antal regioner i rankingen (nämnaren i "plats r / n"). */
  rank_av?: number;
  /** Mått utan målriktning (volym-/strukturmått) — visas med neutralt grått chip. */
  utan_mal?: boolean;
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
  /** Topp 3-zon bland regionerna per år (riktningsmedveten) — grönt band */
  topp3_band?: { period: string; etikett: string; lo: number; hi: number }[];
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
  /** Kort, status-härledd rubrik för sektionens AI-analys (se KpiData.analys_rubrik). */
  analys_rubrik?: string;
  kpier: KpiData[];
  /** Tematiska delar med egen översikt (t.ex. SKR-rapportens indelning).
   *  kpi_ids refererar till kpier; KPI:er utan del renderas som vanligt. */
  delar?: SektionDel[];
}

export interface SektionDel {
  id: string;
  namn: string;
  /** Delens egen översiktsanalys */
  analys: string;
  analys_rubrik?: string;
  /** KPI-id:n i visningsordning (refererar Section.kpier) */
  kpi_ids: string[];
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
  /** Kort, status-härledd rubrik för den globala AI-analysen (se KpiData.analys_rubrik). */
  analys_rubrik?: string;
  /** Senaste kompletta period som visas i dag-toggle */
  dagar_period?: DagarPeriod;
  /** När nästa kompletta period är klar */
  nasta_period?: NastaPeriod;
  sektioner: Section[];
}

export type AllData = Record<string, VyData>;

/** Rapportens omfattning: "alla" sakområden eller ett enskilt sektion-id. */
export type Scope = "alla" | string;

// ── Redigerbara innehållsblock ──

export interface ContentBlock {
  /** "ai"         = autogenererad (renderas alltid från R-texten, lagras ej).
   *  "anteckning" = användarens egna block: rubrik (title) + text + skribent (author).
   *  "rubrik"/"stycke"/"kommentar" = äldre format, migreras lazy till
   *  "anteckning" vid läsning (stores/blocks.ts). */
  id: string;
  type: "ai" | "anteckning" | "rubrik" | "stycke" | "kommentar";
  /** Rubrik ovanför texten (type="anteckning"; äldre "kommentar"). */
  title?: string;
  /** Rubriknivå för äldre type="rubrik" (migreras bort). */
  level?: "h3" | "h4";
  text: string;
  /** Skribentens namn/initialer — visas i bylinen. */
  author?: string;
  timestamp: string;
}
