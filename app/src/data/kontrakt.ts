// data/kontrakt.ts: rå JSON från R (kontrakt v1, så som R skriver
// app/public/data/ i dag) och en enkel kontroll av formen. Ägare: WP1.
//
// Typerna beskriver dagens filer. De är skrivna med src/types.ts (fryst, raderas
// i WP12b) som förlaga men importerar inte därifrån. Bara normalisera.ts och
// laddning.ts läser råformatet; all annan kod läser KapitelModell (modell.ts).
// Kontrakt v2 är parkerat med WP8 (arkitektur avsnitt 5 och 8).

import type { Fakta, Kalla, KallaRef, Status, VyId } from "./modell";

export type KontraktVersion = 1 | 2;

// ── Manifestet (index.json) ──

/** Kort sammanfattning per kapitel i manifestet. */
export interface RaSektionSummering {
  id: string;
  namn: string;
  n_kpier: number;
  n_delar: number;
  status: { gron: number; gul: number; rod: number };
}

/** En tidsupplösning i manifestet. */
export interface RaManifestVy {
  vy: VyId;
  etikett: string;
  period: string;
  datum: string;
  uppdaterad: string;
  jmf_etikett: string;
  analys: string;
  analys_rubrik?: string;
  dagar_period?: { start: string; slut: string; etikett: string };
  nasta_period?: { datum: string; etikett: string };
  sektioner: RaSektionSummering[];
}

/** Manifestet som R skriver: en post per tidsupplösning. */
export type RaManifest = { kontrakt_version?: KontraktVersion } & Partial<Record<VyId, RaManifestVy>>;

// ── En sektionsfil ({vy}-{kapitel}.json) ──

/** En punkt i en tidsserie. Förväntat intervall finns bara för interna mått. */
export interface RaPunkt {
  period: string;
  etikett: string;
  varde: number;
  yhat?: number;
  yhat_lower_80?: number;
  yhat_upper_80?: number;
  yhat_lower?: number;
  yhat_upper?: number;
  signal?: Status;
}

/** Övriga regioner (Kolada-id) som jämförelse. */
export interface RaKontextSerie {
  id: string;
  namn: string;
  tidsserie: { period: string; etikett: string; varde: number }[];
}

/** Underliggande enhet, i dag sjukhus eller ambulansområde. */
export interface RaUndernivaa {
  id: string;
  namn: string;
  senaste: number;
  forandring: number;
  status: Status;
  tidsserie: RaPunkt[];
  dagar?: RaPunkt[];
}

/** Jämförelsevärde: riket (Kolada) eller samma period föregående år (internt). */
export interface RaReferens {
  period: string;
  etikett: string;
  varde: number;
  forandring: number;
}

export interface RaKpi {
  id: string;
  namn: string;
  enhet: "procent" | "minuter" | "antal";
  inverterad: boolean;
  utan_mal?: boolean;
  senaste: number;
  forandring: number;
  forandringar: { etikett: string; varde: number }[];
  status: Status;
  status_fg?: Status;
  analystext: string;
  analys_rubrik?: string;
  fakta?: Fakta;
  beskrivning?: string;
  kalla?: Kalla;
  malniva?: number;
  rank?: number;
  rank_av?: number;
  tidsserie: RaPunkt[];
  dagar?: RaPunkt[];
  dagar_sammanfattning?: { n_dagar: number; n_i_fas: number; n_bevaka: number; n_avvikelse: number };
  referens?: RaReferens;
  referens_serie?: RaPunkt[];
  kontext_serier?: RaKontextSerie[];
  riket_serie?: { period: string; etikett: string; varde: number }[];
  topp3_band?: { period: string; etikett: string; lo: number; hi: number }[];
  undernivaer?: RaUndernivaa[];
}

/** Tematisk del (avsnitt) med indikatorer i visningsordning. */
export interface RaDel {
  id: string;
  namn: string;
  analys: string;
  analys_rubrik?: string;
  kpi_ids: string[];
}

/** En sektionsfil ({vy}-{kapitel}.json) som R skriver. */
export interface RaSektion {
  kontrakt_version?: KontraktVersion;
  id: string;
  namn: string;
  analys: string;
  analys_rubrik?: string;
  inledning?: string[];
  kallor?: KallaRef[];
  leverans?: KallaRef[];
  kpier: RaKpi[];
  delar?: RaDel[];
}

// ── Kontroll ──

const arObjekt = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Vilken kontraktsversion en sektion eller ett manifest följer. Saknas fältet är det v1. */
export function kontraktVersion(raw: unknown): KontraktVersion {
  return arObjekt(raw) && raw.kontrakt_version === 2 ? 2 : 1;
}

/**
 * Kontrollerar att en sektionsfil har den form normalisera läser. Tom lista =
 * giltig. Ingen fullständig schemavalidering (schema och ajv är parkerade med
 * WP8), bara det som annars skulle ge fel längre fram.
 */
export function valideraKontrakt(raw: unknown): string[] {
  if (!arObjekt(raw)) return ["Sektionen är inte ett objekt"];
  const fel: string[] = [];
  if (typeof raw.id !== "string") fel.push("Sektionen saknar id");
  if (typeof raw.namn !== "string") fel.push("Sektionen saknar namn");
  if (!Array.isArray(raw.kpier)) return [...fel, "Sektionen saknar kpier"];
  const kpier: unknown[] = raw.kpier;
  kpier.forEach((k, i) => {
    if (!arObjekt(k)) { fel.push(`kpier[${i}] är inte ett objekt`); return; }
    const namn = typeof k.id === "string" ? k.id : `kpier[${i}]`;
    if (typeof k.id !== "string") fel.push(`${namn}: saknar id`);
    if (typeof k.namn !== "string") fel.push(`${namn}: saknar namn`);
    if (!["procent", "minuter", "antal"].includes(String(k.enhet))) fel.push(`${namn}: okänd enhet ${String(k.enhet)}`);
    if (!Array.isArray(k.tidsserie)) { fel.push(`${namn}: saknar tidsserie`); return; }
    const serie: unknown[] = k.tidsserie;
    serie.forEach((p, j) => {
      if (!arObjekt(p) || typeof p.period !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(p.period)) {
        fel.push(`${namn}: tidsserie[${j}] saknar ISO-period`);
      } else if (p.varde !== null && typeof p.varde !== "number") {
        fel.push(`${namn}: tidsserie[${j}] har ett värde som inte är ett tal`);
      }
    });
  });
  if (raw.delar !== undefined) {
    if (!Array.isArray(raw.delar)) return [...fel, "delar är inte en lista"];
    const ids = new Set(kpier.map((k) => (arObjekt(k) ? k.id : undefined)));
    const delar: unknown[] = raw.delar;
    delar.forEach((d, i) => {
      if (!arObjekt(d) || !Array.isArray(d.kpi_ids)) { fel.push(`delar[${i}] saknar kpi_ids`); return; }
      const kpiIds: unknown[] = d.kpi_ids;
      kpiIds.forEach((id) => { if (!ids.has(id)) fel.push(`delar[${i}]: okänd indikator ${String(id)}`); });
    });
  }
  return fel;
}
