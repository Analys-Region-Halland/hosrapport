// charts/underlag.ts: gemensamma beslut för kpiTillSpec.ts och text.ts, så att
// grafen och dess text alltid bygger på samma urval. Ägare: WP1. Rena funktioner.
//
// Underlaget svarar på: vilken enhet är i fokus, vilka serier är jämförbara,
// vilka underliggande enheter finns, vilken graftyp visar "Över tid" och vilka
// rader har rangordningen.

import { RIKET_ID } from "../data/modell";
import type { Enhet, KapitelModell, KpiModell, Niva, Punkt, Status, VyId } from "../data/modell";
import { platser, sistaMedVarde } from "../data/normalisera";
import type { SpecKontext, VisningId } from "./spec";

/** Hur visningen "tid" ritas (arkitektur 4.2). */
export type TidTyp = "regioner" | "forvantat" | "stapel" | "linje";

/** Nivåns namn i gränssnittet: "Per sjukhus", "Sjukhusen rangordnade", "tre sjukhus". */
export const NIVA_ORD: Record<Niva, { en: string; flera: string; bestamd: string }> = {
  riket: { en: "riket", flera: "riken", bestamd: "riket" },
  region: { en: "region", flera: "regioner", bestamd: "regionerna" },
  forvaltning: { en: "förvaltning", flera: "förvaltningar", bestamd: "förvaltningarna" },
  sjukhus: { en: "sjukhus", flera: "sjukhus", bestamd: "sjukhusen" },
  verksamhet: { en: "verksamhet", flera: "verksamheter", bestamd: "verksamheterna" },
  avdelning: { en: "avdelning", flera: "avdelningar", bestamd: "avdelningarna" },
  vardcentral: { en: "vårdcentral", flera: "vårdcentraler", bestamd: "vårdcentralerna" },
  ambulansomrade: { en: "ambulansområde", flera: "ambulansområden", bestamd: "ambulansområdena" },
  ambulansstation: { en: "station", flera: "stationer", bestamd: "stationerna" },
};

export const PERIODORD: Record<VyId, string> = { dag: "dag", vecka: "vecka", manad: "månad", kvartal: "kvartal", ar: "år" };

export const STATUS_ORD: Record<Status, string> = { gron: "I fas", gul: "Bevaka", rod: "Avvikelse" };

/** Stapel bara upp till så här många perioder (stilguiden 6.6). */
export const MAX_STAPLAR = 24;
/** Små multiplar: högst så här många paneler (stilguiden 6.5). */
export const MAX_PANELER = 12;
/** Summamått indexeras i små multiplar när största enheten är så här många gånger större än minsta. */
export const INDEX_KVOT = 4;

export interface Underlag {
  kpi: KpiModell;
  kap: KapitelModell;
  ctx: SpecKontext;
  /** Periodernas upplösning: "dag" när dagsdata visas. */
  vy: VyId;
  dagar: boolean;
  fokusId: string;
  fokus: Enhet;
  /** Namnet i diagram och tabeller: "Halland" (stilguiden 3.1). */
  fokusNamn: string;
  /** Hela namnet i undertitel och nivåflik: "Region Halland". */
  fokusNamnLang: string;
  /** Rutnätets perioder (samma för alla serier i indikatorn). */
  perioder: string[];
  /** Övriga regioner med serie, bara när fokus är en region. */
  regioner: string[];
  /** Riket för regioner, annars överordnad enhet. Bara om serien finns. */
  referensId?: string;
  /** Enheter på samma nivå under samma förälder (inte regioner), för "+ Jämför med …". */
  syskon: Enhet[];
  /** Underliggande enheter med serie. */
  barn: Enhet[];
  tidTyp: TidTyp;
}

/** Enheten med id, eller en enkel ersättare om kapitlet saknar den. */
export function enhet(kap: KapitelModell, id: string): Enhet {
  return kap.enheter.find((e) => e.id === id) ?? { id, namn: id, niva: "region", parent_id: null };
}

/** Diagramnamnet för en enhet: kortnamn om det finns, annars namn. */
export const kortNamn = (e: Enhet) => e.kortnamn ?? e.namn;

/** Serien som visas för en enhet: perioder eller dagar. */
export function punkter(u: Pick<Underlag, "kpi" | "dagar">, id: string): Punkt[] {
  const s = u.kpi.serier[id];
  if (!s) return [];
  return (u.dagar ? s.dagar : s.tidsserie) ?? [];
}

export function underlag(kpi: KpiModell, kap: KapitelModell, ctx: SpecKontext): Underlag {
  const fokusId = ctx.fokus && kpi.serier[ctx.fokus] ? ctx.fokus : kpi.fokus;
  const dagar = !!ctx.dagar && !!kpi.serier[fokusId]?.dagar?.length;
  const fokus = enhet(kap, fokusId);
  const bas = { kpi, dagar };
  const perioder = punkter(bas, fokusId).map((p) => p.period);
  const harSerie = (id: string) => punkter(bas, id).some((p) => p.varde !== null || p.undertryckt);

  const regioner = fokus.niva === "region"
    ? Object.keys(kpi.serier).filter((id) => id !== fokusId && id !== RIKET_ID && enhet(kap, id).niva === "region" && harSerie(id))
    : [];
  const foralder = fokus.niva === "region" ? RIKET_ID : fokus.parent_id;
  const referensId = foralder && harSerie(foralder) ? foralder : undefined;
  const syskon = fokus.niva === "region" ? [] : kap.enheter.filter((e) =>
    e.id !== fokusId && e.parent_id === fokus.parent_id && e.niva === fokus.niva && harSerie(e.id));
  const barn = kap.enheter.filter((e) => e.parent_id === fokusId && harSerie(e.id));

  const harIntervall = punkter(bas, fokusId).some((p) => p.lo80 !== undefined && p.hi80 !== undefined);
  const tidTyp: TidTyp =
    kpi.aggregering === "summa" && regioner.length === 0 && perioder.length <= MAX_STAPLAR ? "stapel"
      : harIntervall ? "forvantat"
        : regioner.length ? "regioner"
          : "linje";

  return {
    kpi, kap, ctx,
    vy: dagar ? "dag" : ctx.vy,
    dagar,
    fokusId,
    fokus,
    fokusNamn: kortNamn(fokus),
    fokusNamnLang: fokus.namn,
    perioder,
    regioner,
    referensId,
    syskon,
    barn,
    tidTyp,
  };
}

/** Visningarna som datan räcker till, i flikordning. */
export function tillgangliga(u: Underlag): VisningId[] {
  const ut: VisningId[] = ["tid"];
  if (u.regioner.length) ut.push("rang");
  if (u.barn.length >= 2) ut.push("enheter");
  if (u.barn.length >= 3) ut.push("enheterRang");
  return ut;
}

/** Den begärda visningen, eller "tid" om datan inte räcker till den. */
export function giltigVisning(u: Underlag, visning: VisningId): VisningId {
  return tillgangliga(u).includes(visning) ? visning : "tid";
}

/** Barnens nivå (alla barn har normalt samma). */
export const barnNiva = (u: Underlag): Niva => u.barn[0]?.niva ?? "sjukhus";

/** Ska referensen (överordnad nivå) ritas? Bara för andels- och medelmått (stilguiden 6.6). */
export const referensForEnheter = (u: Underlag) => u.kpi.aggregering !== "summa";

/** Första och sista periodindex där någon av serierna har ett värde. */
export function omfang(u: Underlag, ids: string[]): { fran: number; till: number } | null {
  let fran = -1, till = -1;
  for (const id of ids) {
    const p = punkter(u, id);
    p.forEach((q, i) => {
      if (q.varde === null) return;
      if (fran < 0 || i < fran) fran = i;
      if (i > till) till = i;
    });
  }
  return fran < 0 ? null : { fran, till };
}

// ── Rangordning ──

export interface RangRad {
  enhetId: string;
  namn: string;
  varde: number | null;      // null bara för undertryckta rader (visas i tabellen, inte i grafen)
  undertryckt?: boolean;
  plats?: number;            // saknas för neutrala mått och undertryckta rader
}

export interface Rangordning {
  rader: RangRad[];          // bäst till sämst; undertryckta sist
  index: number;             // periodindex
  period: string;
  referens?: { enhetId: string; namn: string; varde: number };
  /** Antal enheter som saknar värde den perioden (inte undertryckta). */
  utanVarde: number;
}

/**
 * Raderna i en rangordning: regionerna (visning "rang") eller de underliggande
 * enheterna ("enheterRang"), senaste perioden. Sorterade efter riktning, lika
 * värden på samma plats. Fokusenhetens plats följer `rank` i datan, som R räknar
 * på oavrundade värden; vid lika avrundade värden flyttas fokus inom gruppen.
 */
export function rangordning(u: Underlag, visning: "rang" | "enheterRang"): Rangordning {
  const ids = visning === "rang" ? [u.fokusId, ...u.regioner] : u.barn.map((e) => e.id);
  // Perioden: fokusenhetens senaste värde för regioner, annars sista perioden där någon enhet har värde.
  let index = visning === "rang" ? sistaMedVarde(punkter(u, u.fokusId)) : -1;
  if (index < 0) index = omfang(u, ids)?.till ?? u.perioder.length - 1;
  const period = u.perioder[index] ?? "";
  const rikt = u.kpi.riktning;

  const alla = ids.map((id) => {
    const p = punkter(u, id)[index];
    return { enhetId: id, namn: kortNamn(enhet(u.kap, id)), varde: p?.varde ?? null, undertryckt: !!p?.undertryckt };
  });
  const med = alla.filter((r) => r.varde !== null);
  const undertryckta: RangRad[] = alla.filter((r) => r.varde === null && r.undertryckt).map((r) => ({ enhetId: r.enhetId, namn: r.namn, varde: null, undertryckt: true }));
  const utanVarde = alla.length - med.length - undertryckta.length;

  const tecken = rikt === "lag" ? 1 : -1;
  const rader: RangRad[] = med
    .sort((a, b) => tecken * ((a.varde as number) - (b.varde as number)) || a.namn.localeCompare(b.namn, "sv"))
    .map((r) => ({ enhetId: r.enhetId, namn: r.namn, varde: r.varde }));

  if (rikt !== "neutral") {
    const p = platser(new Map(rader.map((r) => [r.enhetId, r.varde])), rikt);
    rader.forEach((r) => { r.plats = p.get(r.enhetId); });
    // Fokus på platsen ur datan, inom gruppen med samma avrundade värde.
    const rank = u.kpi.serier[u.fokusId]?.rank;
    const i = rader.findIndex((r) => r.enhetId === u.fokusId);
    if (visning === "rang" && rank !== undefined && i >= 0 && rank !== i + 1) {
      const v = rader[i].varde;
      let mal = Math.min(Math.max(rank - 1, 0), rader.length - 1);
      while (mal > i && rader[mal].varde !== v) mal--;
      while (mal < i && rader[mal].varde !== v) mal++;
      const [f] = rader.splice(i, 1);
      rader.splice(mal, 0, f);
      f.plats = rank;
    }
  }

  let referens: Rangordning["referens"];
  const refId = visning === "rang" ? (u.referensId === RIKET_ID ? RIKET_ID : undefined) : (referensForEnheter(u) ? u.fokusId : undefined);
  if (refId) {
    const v = punkter(u, refId)[index]?.varde;
    if (v !== null && v !== undefined) {
      referens = { enhetId: refId, namn: visning === "rang" ? kortNamn(enhet(u.kap, refId)) : u.fokusNamnLang, varde: v };
    }
  }
  return { rader: [...rader, ...undertryckta], index, period, referens, utanVarde };
}

// ── Små multiplar ──

/** Panelernas enheter: efter senaste värde, störst först, högst tolv (stilguiden 6.6, 6.7). */
export function panelEnheter(u: Underlag): Enhet[] {
  const senaste = (id: string) => {
    const p = punkter(u, id);
    const i = sistaMedVarde(p);
    return i < 0 ? Number.NEGATIVE_INFINITY : (p[i].varde as number);
  };
  return [...u.barn].sort((a, b) => senaste(b.id) - senaste(a.id) || a.namn.localeCompare(b.namn, "sv")).slice(0, MAX_PANELER);
}

/** Summamått med mycket olika storlek visas som index (stilguiden 6.3). */
export function indexera(u: Underlag): boolean {
  if (u.kpi.aggregering !== "summa") return false;
  const senaste = panelEnheter(u).map((e) => {
    const p = punkter(u, e.id);
    const i = sistaMedVarde(p);
    return i < 0 ? null : p[i].varde;
  }).filter((v): v is number => v !== null && v > 0);
  if (senaste.length < 2) return false;
  return Math.max(...senaste) / Math.min(...senaste) > INDEX_KVOT;
}

/** Serien som index (första värdet = 100, en decimal). Undertryckta och saknade punkter behålls som null. */
export function somIndex(p: Punkt[]): Punkt[] {
  const bas = p.find((q) => q.varde !== null && q.varde !== 0)?.varde;
  if (bas === undefined || bas === null) return p;
  return p.map((q) => ({ period: q.period, etikett: q.etikett, varde: q.varde === null ? null : Math.round((1000 * q.varde) / bas) / 10, ...(q.undertryckt ? { undertryckt: true } : {}) }));
}
