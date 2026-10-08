// rapport/rapportText.ts: texter som rapportsidan bygger ur datan: metarad,
// nyckeltalsrad och analystexten utan upprepningar (stilguiden 3.2, 3.4, 4.3,
// 4.4 och 5.2). Rena funktioner utan DOM. Ägare: WP9.

import { lankaBegrepp } from "../begrepp/lanka";
import { alfabetisk, BEGREPP, type Begrepp } from "../begrepp/register";
import { periodLopande } from "../charts/text";
import { kapitelInfo, temaForKapitel } from "../data/kapitelinfo";
import type { KapitelModell, KpiModell, Status, VyId } from "../data/modell";
import { sistaMedVarde } from "../data/normalisera";
import { datum, plats, varde } from "../design/format";

export const STATUSORD: Record<Status, string> = { gron: "I fas", gul: "Bevaka", rod: "Avvikelse" };

/** Analysens namn per tidsupplösning, först i metaraden. */
export const ANALYSNAMN: Record<VyId, string> = {
  dag: "Daglig analys",
  vecka: "Veckoanalys",
  manad: "Månadsanalys",
  kvartal: "Kvartalsanalys",
  ar: "Årsanalys",
};

/** Beskrivande mått: ingen målriktning och därför ingen status (stilguiden 2.3). */
export const arBeskrivande = (kpi: KpiModell): boolean => kpi.status === null && kpi.riktning === "neutral";

// ════════════════════════════════════════════════════════════
//  Perioder
// ════════════════════════════════════════════════════════════

/** Perioden för indikatorns senaste värde (fokusenheten), ISO. undefined utan värden. */
export function senastePeriod(kpi: KpiModell): string | undefined {
  const ts = kpi.serier[kpi.fokus]?.tidsserie ?? [];
  const i = sistaMedVarde(ts);
  return i >= 0 ? ts[i].period : undefined;
}

/** Kapitlets period: den senaste perioden som någon indikator har värde för. */
export function kapitletsPeriod(kap: KapitelModell): string | undefined {
  let max: string | undefined;
  for (const k of kap.kpier) {
    const p = senastePeriod(k);
    if (p && (!max || p > max)) max = p;
  }
  return max;
}

/** En period i metarad och nyckeltalsrad: "2025", "mars 2026", "vecka 13 2026". */
export const periodText = (iso: string, vy: VyId): string => periodLopande(iso, vy);

// ════════════════════════════════════════════════════════════
//  Metaraden (stilguiden 4.3)
// ════════════════════════════════════════════════════════════

/** "10 indikatorer i 4 avsnitt" eller "4 indikatorer" för kapitel utan avsnitt. Siffror, inte ord (3.2: vid jämförelse). */
export function omfangText(kap: KapitelModell): string {
  const n = kap.kpier.length;
  const ind = `${n} ${n === 1 ? "indikator" : "indikatorer"}`;
  const a = kap.avsnitt.length;
  return a ? `${ind} i ${a} avsnitt` : ind;
}

/** Källan i metaraden: leveranskanalen för SKR-kapitlen, annars kapitlets källa. */
export function kallaKort(kap: KapitelModell): string | undefined {
  if (kap.kpier.length && kap.kpier.every((k) => k.id.startsWith("kolada-"))) return "SKR via Kolada";
  return kapitelInfo(kap.id)?.kalla ?? kap.kpier.find((k) => k.kalla)?.kalla?.namn;
}

/** "Publicerad 31 mar 2026". */
export const publiceradText = (iso: string): string => `Publicerad ${datum(iso, true)}`;

/** Metaradens delar för ett kapitel (utan tidsupplösningsväljaren). */
export function kapitelMetarad(kap: KapitelModell, vy: VyId, publicerad?: string): string[] {
  const p = kapitletsPeriod(kap);
  const kalla = kallaKort(kap);
  const delar = [p ? `${ANALYSNAMN[vy]} ${periodText(p, vy)}` : ANALYSNAMN[vy], omfangText(kap)];
  if (kalla) delar.push(`Källa: ${kalla}`);
  if (publicerad) delar.push(publiceradText(publicerad));
  return delar;
}

/** Kickern ovanför kapitlets titel: temat. */
export const kapitelKicker = (kap: KapitelModell): string | undefined => temaForKapitel(kap.id)?.namn;

/** Kapitlets dek: ur datan när R levererar en, annars ur kapitelinfo. */
export const kapitelDek = (kap: KapitelModell): string | undefined => kap.dek ?? kapitelInfo(kap.id)?.beskrivning;

// ════════════════════════════════════════════════════════════
//  Nyckeltalsraden (stilguiden 4.4 och 5.2)
// ════════════════════════════════════════════════════════════

export interface NyckeltalDelar {
  /** Värdet, i 600 farg.black. */
  varde: string;
  /** Resten i ordning: plats (eller "beskrivande mått") och period. */
  delar: string[];
}

/**
 * "87,7 %  ·  plats 8 av 21  ·  2024" (rankade), "45 300 kr  ·  beskrivande mått
 * ·  2024" (beskrivande) och "96,9 %  ·  mars 2026" (interna). Plats skrivs
 * "plats r av n" där n är antalet regioner med värde (rank_av).
 */
export function nyckeltalDelar(kpi: KpiModell, vy: VyId): NyckeltalDelar {
  const f = kpi.serier[kpi.fokus];
  const p = senastePeriod(kpi);
  const ts = f?.tidsserie ?? [];
  const sista = sistaMedVarde(ts);
  const v = f?.senaste ?? (sista >= 0 ? ts[sista].varde : null);
  const delar: string[] = [];
  if (arBeskrivande(kpi)) delar.push("beskrivande mått");
  else if (f?.rank !== undefined && f.rank_av !== undefined) delar.push(plats(f.rank, f.rank_av));
  if (p) delar.push(periodText(p, vy));
  return { varde: varde(v, kpi.format), delar };
}

// ════════════════════════════════════════════════════════════
//  Analystexten utan upprepningar (stilguiden 3.4)
// ════════════════════════════════════════════════════════════

const blank = "[\\s\\u00a0]";
const regexText = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Analysen får inte börja med siffror som redan står i nyckeltalsraden
 * (stilguiden 3.4). Dagens texter från R gör det, så tills R skriver om dem
 * (WP8) tas den inledande upprepningen bort här:
 *   "Region Halland redovisar ett utfall på 89,8 procent (2025) och placerar
 *    sig på plats 7 av 19 bland regionerna."              → meningen tas bort
 *   "{Namn} ligger på 45 300 (2024)."                      → meningen tas bort
 *   "{Namn} ligger på 96,9 procent, en minskning med 2,4 procent jämfört med
 *    föregående månad."   → "{Namn} minskade med 2,4 procent jämfört med föregående månad."
 * Annan text lämnas orörd.
 */
export function utanUpprepning(text: string, kpi: KpiModell): string {
  const t = text.trim();
  const namn = regexText(kpi.namn);
  const rankad = new RegExp(`^Region${blank}Halland redovisar ett utfall på [^.]*?\\(\\d{4}\\) och placerar sig på plats${blank}\\d+ av${blank}\\d+ bland regionerna\\.\\s*`);
  const lage = new RegExp(`^${namn} ligger på [^.()]*?\\(\\d{4}\\)\\.\\s*`);
  const forandring = new RegExp(`^(${namn}) ligger på .+?, en (ökning|minskning) med ([^.]+? jämfört med [^.]+)\\.`);
  if (rankad.test(t)) return t.replace(rankad, "");
  if (lage.test(t)) return t.replace(lage, "");
  return t.replace(forandring, (_hel, n: string, rorelse: string, resten: string) =>
    `${n} ${rorelse === "ökning" ? "ökade" : "minskade"} med ${resten}.`);
}

// ════════════════════════════════════════════════════════════
//  Begrepp i kapitlet (Om statistiken)
// ════════════════════════════════════════════════════════════

/** Alla texter kapitlet visar: huvudpunkter, analyser, fördjupning och metodtext. */
function kapitletsTexter(kap: KapitelModell): string[] {
  const ut = [...kap.huvudpunkter.map((h) => h.text), ...kap.om_statistiken];
  for (const k of kap.kpier) {
    ut.push(k.analystext);
    const f = k.fakta;
    if (f) ut.push(f.matt, f.avgransning, f.riktning, f.teori, ...f.faktorer.map((x) => x.text));
  }
  return ut.filter(Boolean);
}

/** Begreppen som förekommer i kapitlets texter, alfabetiskt (stilguiden 4.3). */
export function begreppIKapitlet(kap: KapitelModell, register: Begrepp[] = BEGREPP): Begrepp[] {
  const redan = new Set<string>();
  for (const text of kapitletsTexter(kap)) lankaBegrepp(text, register, redan);
  return alfabetisk(register.filter((b) => redan.has(b.id)));
}
