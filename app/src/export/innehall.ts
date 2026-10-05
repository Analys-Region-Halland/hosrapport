// export/innehall.ts: vilka bilder decket har och vad som står på dem
// (stilguiden 4.2–4.4 och 6.9). Ren funktion av kapitlen; pptx.ts ritar.
// Ägare: WP12a.
//
// Ett kapitel:
//   titelbild         kicker (temat), kapitlets namn, dek, metarad med period
//                     och publiceringsdatum
//   Det viktigaste    kapitlets huvudpunkter, högst sex, med "se 2.3" som länk
//   Läget i korthet   översiktstabellen med status i ord, flera bilder vid behov
//   avsnitt           nummer, namn, dek och avsnittets indikatorer (länkar)
//   indikator         en bild per indikator (små multiplar: en bild per sex paneler)
//   källor            primärkällor och leveranskedja
// Hela rapporten: rapportens titelbild, Det viktigaste över alla kapitel och
// Kapitlen i korthet, sedan varje kapitel som ovan.
//
// Texterna hämtas där webben hämtar dem (rapport/rapportText.ts,
// rapport/oversikt.ts, rapport/huvudpunkter.ts, charts/kpiTillSpec.ts), så att
// decket och webbrapporten säger samma sak.

import { utanMarkering } from "../begrepp/lanka";
import { kpiTillSpec, visningar } from "../charts/kpiTillSpec";
import type { ChartSpec, VisningId } from "../charts/spec";
import type { KallaRef, KapitelModell, KpiModell, Status, VyId } from "../data/modell";
import { HART, varde } from "../design/format";
import { nummerFor, valjOverKapitel } from "../rapport/huvudpunkter";
import { oversiktRader } from "../rapport/oversikt";
import { byggDisposition } from "../rapport/ramDisposition";
import {
  ANALYSNAMN, kapitelDek, kapitelKicker, kapitelMetarad, kapitletsPeriod, nyckeltalDelar, periodText, publiceradText, utanUpprepning,
  type NyckeltalDelar,
} from "../rapport/rapportText";
import { kapitelInfo } from "../data/kapitelinfo";
import { textbredd } from "../charts/karna/matt";
import { tema } from "../design/tema";
import { panelsidor } from "./graf";

// ════════════════════════════════════════════════════════════
//  Bilderna
// ════════════════════════════════════════════════════════════

interface BildBas {
  /** Unikt id, mål för länkar inom decket. */
  id: string;
  /** Kickern ovanför bildens titel. */
  kicker: string;
  /** Sidfotens text. */
  sidfot: string;
}

/** En länk till en annan bild i decket. */
export interface Hanvisning { text: string; mal: string }

export interface TitelBild extends BildBas {
  typ: "titel";
  niva: "rapport" | "kapitel";
  titel: string;
  dek?: string;
  metarad: string[];
  notis?: string;
}

export interface ViktigastBild extends BildBas {
  typ: "viktigast";
  punkter: { text: string; se?: Hanvisning }[];
}

export interface KapitelListaBild extends BildBas {
  typ: "kapitelLista";
  rader: { nummer: string; namn: string; mal: string; indikatorer: number; status: Record<Status, number>; beskrivande: number }[];
}

export type LagetRad =
  | { typ: "grupp"; namn: string }
  | { typ: "rad"; nummer: string; namn: string; senaste: string; period?: string; plats: string; status: Status | null; mal: string };

export interface LagetBild extends BildBas {
  typ: "laget";
  sida: number;
  sidor: number;
  harPlats: boolean;
  rader: LagetRad[];
}

export interface AvsnittBild extends BildBas {
  typ: "avsnitt";
  nummer: string;
  namn: string;
  dek?: string;
  indikatorer: { nummer: string; namn: string; mal: string }[];
}

export interface IndikatorBild extends BildBas {
  typ: "indikator";
  nummer: string;
  namn: string;
  status: Status | null;
  nyckeltal: NyckeltalDelar;
  /** Analysen beskuren till två eller tre meningar. */
  analys: string;
  spec: ChartSpec;
  /** Små multiplar med fler än sex paneler fortsätter på nästa bild. */
  sida: number;
  sidor: number;
}

export interface KallBild extends BildBas {
  typ: "kallor";
  poster: { namn: string; url?: string; huvudman: string; typ: string; indikatorer?: number; leverans: boolean }[];
  vag: string;
}

export type Bild = TitelBild | ViktigastBild | KapitelListaBild | LagetBild | AvsnittBild | IndikatorBild | KallBild;

export interface DeckVal {
  /** Titelbildens titel: kapitlets namn eller rapportens titel. */
  titel: string;
  vy: VyId;
  /** "kapitel" ger ett kapitel; "rapport" ger rapportens bilder först. Förval: rapport när fler än ett kapitel. */
  omfang?: "kapitel" | "rapport";
  /** Titelbildens kicker. Förval: temat (kapitel) eller "Region Halland · Analys" (rapport). */
  kicker?: string;
  /** Publiceringsdatum (ISO), manifestets datum för vyn. */
  publicerad?: string;
  /** Figurens visning per indikator. Förval: figurens förvalda visning. */
  visning?: (kpi: KpiModell, kap: KapitelModell) => VisningId | undefined;
  /** Fästa enheter per indikator. Förval: inga. */
  fasta?: (kpi: KpiModell, kap: KapitelModell) => string[] | undefined;
}

export const RAPPORTKICKER = "Region Halland · Analys";
export const RAPPORTDEK = "En samlad analys av hälso- och sjukvården i Halland. Det viktigaste först, sedan kapitel för kapitel.";
/** Högst så här många radenheter (grupper inräknade, ett namn på två rader räknas två) i Läget i korthet per bild. */
export const LAGET_RADER_PER_BILD = 12;
/** Läget i korthets kolumnbredder i tum (summa = bildens innerbredd, 9 tum). */
export const LAGET_KOLUMNER = { namn: 5.45, senaste: 1.25, plats: 0.95, status: 1.35 } as const;
/** Högst så här många punkter i Det viktigaste (stilguiden 3.4). */
export const MAX_PUNKTER = 6;

// ════════════════════════════════════════════════════════════
//  Texter
// ════════════════════════════════════════════════════════════

/** Tecken (privat område i Unicode) som tillfälligt ersätter förkortningens punkt. */
const SKYDD = "";
const FORKORTNINGAR = /(?<![\p{L}])(kv|v|inv|p\.e|t\.ex|bl\.a|ca|nr|jmf|s\.k)\./giu;

/** Texten delad i meningar. Förkortningar (kv., t.ex., p.e. …) avslutar ingen mening (som charts/text.ts antalMeningar). */
export function meningar(text: string): string[] {
  const skyddad = text.trim().replace(FORKORTNINGAR, (_m, f: string) => `${f}${SKYDD}`);
  if (!skyddad) return [];
  return skyddad
    .split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}])/u)
    .map((m) => m.replaceAll(SKYDD, ".").trim())
    .filter(Boolean);
}

/** Längre än så blir tre meningar för mycket för bildens analysspalt; då blir det två. */
const ANALYS_MAX_TECKEN = 300;

/**
 * Indikatorns analys för bilden: utan inledande upprepning av nyckeltalen
 * (rapportText.utanUpprepning), utan begreppsmarkering, beskuren till tre
 * meningar, eller två när tre blir för långt.
 */
export function kortAnalys(kpi: KpiModell): string {
  // Tusental med hårt mellanslag (stilguiden 3.2), så att "13 667,6" inte bryts på bilden
  const text = utanMarkering(utanUpprepning(kpi.analystext, kpi)).replace(/(\d) (\d{3})(?!\d)/g, `$1${HART}$2`);
  const m = meningar(text);
  const tre = m.slice(0, 3);
  return (tre.join(" ").length > ANALYS_MAX_TECKEN && tre.length > 2 ? tre.slice(0, 2) : tre).join(" ");
}

/** Primärkällorna: kapitlets källförteckning, annars indikatorernas egna källor (som Om statistiken). */
function primarkallor(kap: KapitelModell): KallaRef[] {
  if (kap.kallor.length) return kap.kallor;
  const per = new Map<string, KallaRef>();
  for (const k of kap.kpier) {
    if (!k.kalla) continue;
    const { kolada_kalla: _kolada, ...kalla } = k.kalla;
    const finns = per.get(kalla.namn);
    per.set(kalla.namn, { ...kalla, n_indikatorer: (finns?.n_indikatorer ?? 0) + 1 });
  }
  return [...per.values()];
}

const kapitelSidfot = (kap: KapitelModell, vy: VyId): string => {
  const p = kapitletsPeriod(kap);
  return [kap.namn, p ? `${ANALYSNAMN[vy]} ${periodText(p, vy)}` : ANALYSNAMN[vy]].join(" · ");
};

/** Källraden i indikatorbildens sidfot (stilguiden 6.1). */
const kallrad = (spec: ChartSpec): string | undefined => (spec.kalla ? `Källa: ${spec.kalla.namn}` : undefined);

// ════════════════════════════════════════════════════════════
//  Ett kapitel
// ════════════════════════════════════════════════════════════

const id = (kap: KapitelModell, del: string) => `${kap.id}:${del}`;
export const indikatorId = (kap: KapitelModell, kpiId: string): string => id(kap, `kpi:${kpiId}`);

function kapitelBilder(kap: KapitelModell, val: DeckVal, nr: number | null): Bild[] {
  const vy = val.vy;
  const d = byggDisposition(kap);
  const kpier = new Map(kap.kpier.map((k) => [k.id, k]));
  const sidfot = kapitelSidfot(kap, vy);
  const kicker = kap.namn;
  const nummer = nummerFor(kap);
  const ut: Bild[] = [];

  // Titelbild
  const tema = kapitelKicker(kap);
  const notis = kapitelInfo(kap.id)?.notis;
  ut.push({
    typ: "titel", id: id(kap, "titel"), niva: "kapitel", sidfot,
    kicker: nr !== null ? [`Kapitel ${nr}`, tema].filter(Boolean).join(" · ") : val.kicker ?? tema ?? RAPPORTKICKER,
    titel: nr !== null ? kap.namn : val.titel,
    ...(kapitelDek(kap) ? { dek: kapitelDek(kap) } : {}),
    metarad: kapitelMetarad(kap, vy, val.publicerad),
    ...(notis ? { notis } : {}),
  });

  // Det viktigaste
  const punkter = kap.huvudpunkter.slice(0, MAX_PUNKTER).map((h) => {
    const nr2 = h.kpi_id ? nummer.get(h.kpi_id) : undefined;
    return nr2 && h.kpi_id ? { text: h.text, se: { text: `se ${nr2}`, mal: indikatorId(kap, h.kpi_id) } } : { text: h.text };
  });
  if (punkter.length) ut.push({ typ: "viktigast", id: id(kap, "viktigast"), kicker, sidfot, punkter });

  // Läget i korthet
  const rader = oversiktRader(kap);
  if (rader.length) {
    const harPlats = rader.some((r) => r.plats !== null);
    const alla: LagetRad[] = [];
    let grupp: string | null = null;
    for (const r of rader) {
      if (r.grupp && r.grupp.id !== grupp) {
        alla.push({ typ: "grupp", namn: r.grupp.namn });
        grupp = r.grupp.id;
      }
      const kpi = kpier.get(r.kpiId) as KpiModell;
      alla.push({
        typ: "rad", nummer: r.nummer, namn: r.namn, mal: indikatorId(kap, r.kpiId),
        senaste: varde(r.senaste, kpi.format),
        ...(r.avvikandePeriod ? { period: periodText(r.avvikandePeriod, vy) } : {}),
        plats: r.plats !== null && r.platsAv !== null ? `${r.plats} av ${r.platsAv}` : "",
        status: r.status,
      });
    }
    const sidor = delaRader(alla, LAGET_RADER_PER_BILD, harPlats);
    sidor.forEach((s, i) => ut.push({
      typ: "laget", id: id(kap, `laget:${i}`), kicker, sidfot, sida: i, sidor: sidor.length, harPlats, rader: s,
    }));
  }

  // Avsnitt och indikatorer
  const indikator = (kpiId: string, nr3: string) => {
    const kpi = kpier.get(kpiId);
    if (!kpi) return;
    const ctx = { vy, fasta: val.fasta?.(kpi, kap) ?? [] };
    const vis = val.visning?.(kpi, kap) ?? visningar(kpi, kap, { vy })[0]?.id ?? "tid";
    const spec = kpiTillSpec(kpi, kap, ctx, vis);
    const sidor = panelsidor(spec);
    const analys = kortAnalys(kpi);
    const nyckeltal = nyckeltalDelar(kpi, vy);
    for (let s = 0; s < sidor; s++) {
      ut.push({
        typ: "indikator", id: s === 0 ? indikatorId(kap, kpiId) : `${indikatorId(kap, kpiId)}:${s}`,
        kicker, sidfot: kallrad(spec) ?? sidfot,
        nummer: nr3, namn: kpi.namn, status: kpi.status, nyckeltal, analys, spec, sida: s, sidor,
      });
    }
  };
  for (const a of d.avsnitt) {
    const modell = kap.avsnitt.find((x) => x.id === a.id);
    ut.push({
      typ: "avsnitt", id: id(kap, `avsnitt:${a.id}`), kicker, sidfot,
      nummer: a.nummer, namn: a.namn,
      ...(modell?.dek ? { dek: modell.dek } : {}),
      indikatorer: a.indikatorer.map((x) => ({ nummer: x.nummer, namn: x.namn, mal: indikatorId(kap, x.id) })),
    });
    for (const x of a.indikatorer) indikator(x.id, x.nummer);
  }
  for (const x of d.indikatorer) indikator(x.id, x.nummer);

  // Källor
  const kallor = primarkallor(kap);
  if (kallor.length || kap.leverans.length) {
    ut.push({
      typ: "kallor", id: id(kap, "kallor"), kicker, sidfot,
      poster: [
        ...kallor.map((k) => ({ namn: k.namn, ...(k.url ? { url: k.url } : {}), huvudman: k.huvudman, typ: k.typ, ...(k.n_indikatorer ? { indikatorer: k.n_indikatorer } : {}), leverans: false })),
        ...kap.leverans.map((k) => ({ namn: k.namn, ...(k.url ? { url: k.url } : {}), huvudman: k.huvudman, typ: k.typ, leverans: true })),
      ],
      vag: [kallor.length === 1 ? kallor[0].namn : "Primärkällorna", ...kap.leverans.map((l) => l.namn), "rapporten"].join(" › "),
    });
  }
  return ut;
}

/**
 * Hur många radenheter en rad tar: en, eller två när indikatorns namn bryts
 * i namnkolumnen. Mäts med diagrammets mätare (typ.roll.granssnitt).
 */
export function radenheter(r: LagetRad, harPlats: boolean): number {
  if (r.typ === "grupp") return 1;
  const bredd = (LAGET_KOLUMNER.namn + (harPlats ? 0 : LAGET_KOLUMNER.plats) - 0.1) * 96;
  return textbredd(r.namn, tema.typ.roll.granssnitt.vikt, tema.typ.roll.granssnitt.storlek) * 1.05 > bredd ? 2 : 1;
}

/** Delar raderna i bilder om högst `max` radenheter; en grupprubrik står aldrig sist på en bild. */
export function delaRader(rader: LagetRad[], max: number, harPlats = true): LagetRad[][] {
  const ut: LagetRad[][] = [];
  let nu: LagetRad[] = [];
  let enheter = 0;
  for (const r of rader) {
    const e = radenheter(r, harPlats);
    if (nu.length && enheter + e > max) {
      const flytta = nu[nu.length - 1]?.typ === "grupp" ? [nu.pop() as LagetRad] : [];
      ut.push(nu);
      nu = flytta;
      enheter = flytta.length;
    }
    nu.push(r);
    enheter += e;
  }
  if (nu.length) ut.push(nu);
  return ut;
}

// ════════════════════════════════════════════════════════════
//  Hela decket
// ════════════════════════════════════════════════════════════

const statusRakning = (kap: KapitelModell) => {
  const r: Record<Status, number> = { gron: 0, gul: 0, rod: 0 };
  for (const k of kap.kpier) if (k.status) r[k.status]++;
  return r;
};

/** Decket som en lista bilder i ordning. */
export function planeraDeck(kapitel: KapitelModell[], val: DeckVal): Bild[] {
  const omfang = val.omfang ?? (kapitel.length > 1 ? "rapport" : "kapitel");
  if (omfang === "kapitel") return kapitel.flatMap((k) => kapitelBilder(k, val, null));

  const vy = val.vy;
  const antal = kapitel.reduce((n, k) => n + k.kpier.length, 0);
  const perioder = kapitel.map(kapitletsPeriod).filter((p): p is string => !!p).sort();
  const period = perioder[perioder.length - 1];
  const analys = period ? `${ANALYSNAMN[vy]} ${periodText(period, vy)}` : ANALYSNAMN[vy];
  const sidfot = [val.titel, analys].join(" · ");
  const kicker = val.titel;
  const ut: Bild[] = [{
    typ: "titel", id: "rapport:titel", niva: "rapport", sidfot,
    kicker: val.kicker ?? RAPPORTKICKER,
    titel: val.titel,
    dek: RAPPORTDEK,
    metarad: [analys, `${kapitel.length} kapitel`, `${antal} indikatorer`, ...(val.publicerad ? [publiceradText(val.publicerad)] : [])],
  }];

  // Det viktigaste över alla kapitel (som sammanfattningen)
  const nummer = kapitel.map((k) => nummerFor(k));
  const valda = valjOverKapitel(kapitel, MAX_PUNKTER);
  if (valda.length) {
    ut.push({
      typ: "viktigast", id: "rapport:viktigast", kicker, sidfot,
      punkter: valda.map((v) => {
        const kap = kapitel[v.kapitelIndex];
        const nr = v.punkt.kpi_id ? nummer[v.kapitelIndex].get(v.punkt.kpi_id) : undefined;
        return nr && v.punkt.kpi_id
          ? { text: v.punkt.text, se: { text: `se ${nr} i kapitel ${v.kapitelIndex + 1}`, mal: indikatorId(kap, v.punkt.kpi_id) } }
          : { text: v.punkt.text };
      }),
    });
  }

  // Kapitlen i korthet
  ut.push({
    typ: "kapitelLista", id: "rapport:kapitel", kicker, sidfot,
    rader: kapitel.map((k, i) => ({
      nummer: String(i + 1), namn: k.namn, mal: id(k, "titel"), indikatorer: k.kpier.length,
      status: statusRakning(k), beskrivande: k.kpier.filter((x) => x.status === null).length,
    })),
  });

  kapitel.forEach((k, i) => ut.push(...kapitelBilder(k, val, i + 1)));
  return ut;
}
