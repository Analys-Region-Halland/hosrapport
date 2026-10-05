// data/modell.ts: rapportens datamodell efter normalisering (docs/arkitektur.md 4.1).
// Ägare: WP1. Skapad av WP0 med slutliga typer så att alla paket kompilerar mot
// varandra från början. Ny kod importerar härifrån, aldrig från src/types.ts.
//
// Konventioner från normalisera (WP1):
//   - Regioner och riket har parent_id null. Riket är regionernas referens men
//     inte deras förälder, så att brödsmulan börjar på Region Halland.
//   - Underliggande enheter har parent_id = överordnad enhet ("0013" för sjukhus).
//   - Alla serier i en indikator ligger på samma periodrutnät: en punkt per
//     periodsteg, luckor som varde: null. Samma gäller `dagar`.
//   - EnhetSerie.senaste för regioner och riket är värdet samma period som
//     fokusenhetens senaste värde (rangordningens period).

/** Kolada-id för Region Halland, normalt fokus. */
export const HALLAND_ID = "0013";
/** Kolada-id för riket. */
export const RIKET_ID = "0000";

export type Status = "gron" | "gul" | "rod";
export type VyId = "dag" | "vecka" | "manad" | "kvartal" | "ar";
// Tillägg i WP10: ambulansområde och ambulansstation, så att ambulansuppdragens
// enheter (Nord och Syd) inte kallas sjukhus och kan borras ned till stationer.
export type Niva =
  | "riket" | "region" | "forvaltning" | "sjukhus" | "verksamhet" | "avdelning" | "vardcentral"
  | "ambulansomrade" | "ambulansstation";

export interface Enhet {
  id: string;              // Kolada-kod för regioner ("0013" = Region Halland, "0000" = riket), annars slug
  namn: string;
  kortnamn?: string;       // för etiketter under 520 px
  niva: Niva;
  parent_id: string | null;
  ordning?: number;        // naturlig ordning när den är meningsbärande
}

export interface Punkt {
  period: string;          // ISO-datum för periodens början
  etikett: string;
  varde: number | null;    // null = saknas eller undertryckt
  n?: number;
  undertryckt?: boolean;
  yhat?: number; lo80?: number; hi80?: number; lo95?: number; hi95?: number;
  signal?: Status;
}

export interface EnhetSerie {
  enhet_id: string;
  senaste: number | null;
  forandring?: number;
  status?: Status;
  rank?: number;
  rank_av?: number;
  tidsserie: Punkt[];
  dagar?: Punkt[];
}

export interface TalFormat {
  enhet: "procent" | "minuter" | "antal" | "kronor" | "kvot" | "per_invanare";
  decimaler: number;
  etikett: string;         // "%", "min", "kr", "per 100 000 inv."
}

export interface Not {
  typ: "seriebrott" | "fotnot" | "lucka" | "undertryckt" | "skala";
  period?: string;
  text: string;
  begrepp_id?: string;
}

export interface Huvudpunkt { text: string; kpi_id?: string; ton: "positiv" | "negativ" | "neutral" }

export interface KpiModell {
  id: string;
  namn: string;
  format: TalFormat;
  aggregering: "medel" | "summa" | "andel";
  riktning: "hog" | "lag" | "neutral";      // ersätter inverterad + utan_mal
  status: Status | null;                      // null för beskrivande mått
  status_fg?: Status;
  fokus: string;                              // enhet_id, normalt "0013"
  serier: Record<string, EnhetSerie>;         // fokus, jämförbara (regioner, riket) och underliggande
  jamforelse?: { typ: "riket" | "foregaende_period"; varde: number; etikett: string; period: string };
  topp3_band?: { period: string; lo: number; hi: number }[];
  analystext: string;
  fakta?: Fakta;                              // oförändrad typ från R
  kalla?: Kalla;                              // oförändrad typ från R
  beskrivning?: string;
  noter: Not[];
  dagar_sammanfattning?: { n_dagar: number; n_i_fas: number; n_bevaka: number; n_avvikelse: number };
}

export interface AvsnittModell { id: string; namn: string; dek?: string; kpi_ids: string[] }

export interface KapitelModell {
  id: string; namn: string; dek?: string;
  huvudpunkter: Huvudpunkt[];
  enheter: Enhet[];
  avsnitt: AvsnittModell[];                   // tom = kapitel utan avsnitt
  kpier: KpiModell[];
  om_statistiken: string[];                   // dagens `inledning`
  kallor: KallaRef[]; leverans: KallaRef[];
}

// ── Typer som R levererar oförändrade. Kopierade från src/types.ts (fryst,
//    raderas i WP12b) så att ny kod inte behöver importera därifrån. ──

/** Varifrån en indikator kommer, bortom leveranskanalen. Byggs i R/teman/kolada/kallor.R. */
export interface Kalla {
  /** Nyckel i källregistret, t.ex. "riksstroke". "okand" = ej klassificerad. */
  id: string;
  /** Källans namn så som den ska stå i rapporten. */
  namn: string;
  /** Vem som ansvarar för källan. */
  huvudman: string;
  /** Sorts källa, t.ex. "Nationellt kvalitetsregister". */
  typ: string;
  /** Vad källan är och vad den innebär för tolkningen. */
  om: string;
  url?: string;
  /** Hur ofta källan ger nya siffror. */
  uppdatering?: string;
  /** Koladas egen källformulering, ordagrant ur indikatorbeskrivningen. */
  kolada_kalla?: string;
}

/** Källa i ett kapitels källförteckning: som Kalla, plus antal indikatorer som vilar på den. */
export interface KallaRef extends Omit<Kalla, "kolada_kalla"> {
  n_indikatorer?: number;
}

/** En påverkansfaktor: kort etikett, förklaring och vid behov en hänvisning. */
export interface Paverkansfaktor {
  rubrik: string;
  text: string;
  kalla?: { namn: string; url?: string };
}

/** Redaktionellt faktaunderlag per indikator (R/teman/kolada/indikatorfakta.R). */
export interface Fakta {
  /** Vad indikatorn räknar, i klartext (täljare och nämnare). */
  matt: string;
  /** Önskvärd riktning, inklusive målnivå där en sådan finns. */
  riktning: string;
  /** Vad måttet inte fångar, och vem som ingår i underlaget. */
  avgransning: string;
  /** Mekanismen: varför talet ligger där det ligger och rör sig som det gör. */
  teori: string;
  /** Det som drar i talet. */
  faktorer: Paverkansfaktor[];
}
