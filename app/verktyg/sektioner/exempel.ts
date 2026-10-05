// exempel.ts: exempeldata för den levande stilguiden. Galleriets exempel
// (docs/arkitektur.md WP7), deras ChartSpec, översiktstabellens rader och riktigt
// innehåll till typografiproverna. Ägare: WP7.
//
// Datan är rapportens egen JSON i app/public/data. Specen byggs i första hand av
// WP1:s normalisera + kpiTillSpec. Så länge de är stubbar ("Ej byggd: WP1")
// bygger galleriet en enkel reservspec direkt ur v1-JSON, så att WP2 och WP3 har
// riktig data att rita mot från början. Reservspecen följer stilguiden 6.2–6.4
// i stora drag men är inte facit; när WP1 finns används alltid dess spec.
//
// Användning i en sektion (WP2, WP3):
//   import { exempelSpec } from "./exempel";
//   <Figur spec={exempelSpec("spaghetti-luckor")} rubrikniva={4} />
// Stilguiden anropar laddaExempeldata() före första renderingen, så exempelSpec
// är synkron inne i sektionerna. Andra sidor (t.ex. grafprov) väntar själva in
// laddaExempeldata() först.

import { kpiTillSpec } from "../../src/charts/kpiTillSpec";
import type { ChartSpec, DiagramTyp, SpecKontext, SpecSerie, VisningId } from "../../src/charts/spec";
import { normalisera } from "../../src/data/normalisera";
import type { Not, Punkt, Status, TalFormat, VyId } from "../../src/data/modell";
import { DASH, HART, period as periodText, periodIntervall, plats, varde as vardeText } from "../../src/design/format";

// ════════════════════════════════════════════════════════════
//  Exemplen
// ════════════════════════════════════════════════════════════

export type ExempelNamn =
  | "spaghetti-luckor"
  | "spaghetti-hel"
  | "linje-fasta"
  | "rangordning"
  | "forvantat"
  | "stapel"
  | "sma-multiplar"
  | "minidiagram";

export interface Exempel {
  namn: ExempelNamn;
  /** Rubrik i galleriet (h3). */
  rubrik: string;
  /** Vad exemplet prövar, en till två meningar. */
  vad: string;
  /** Graftypen exemplet ska ritas som. */
  typ: DiagramTyp;
  /** Paketet som bygger renderaren. */
  paket: "WP2" | "WP3";
  /** Renderarens fil under app/src. */
  fil: string;
  /** Datafil (public/data/{vy}-{sektion}.json) och indikator. */
  kalla: { vy: VyId; sektion: string; kpi: string };
  visning: VisningId;
  /** Fästa enheter (Kolada-koder) i exemplets utgångsläge. */
  fasta?: string[];
  /** Noter som v1-datan saknar (t.ex. seriebrott) tills R levererar dem (WP8). */
  noter?: Not[];
}

const LINJE = "charts/typer/linje.tsx";

export const EXEMPEL: readonly Exempel[] = [
  {
    namn: "spaghetti-luckor",
    rubrik: "Linje med alla regioner, luckor och seriebrott",
    vad: "Telefontillgängligheten med 21 regioner och riket. Halland saknar värden 2023 och 2024, och mätmetoden byttes 2024.",
    typ: "linje", paket: "WP2", fil: LINJE,
    kalla: { vy: "ar", sektion: "skr-tillganglighet", kpi: "kolada-n79179" },
    visning: "tid",
    noter: [{
      typ: "seriebrott", period: "2024-01-01", begrepp_id: "seriebrott",
      text: "Från 2024 mäts telefontillgängligheten på ett nytt sätt. Jämför över brottet med försiktighet.",
    }],
  },
  {
    namn: "spaghetti-hel",
    rubrik: "Linje med alla regioner, utan luckor",
    vad: "Första besök i allmänpsykiatrin, där alla 21 regioner och riket har värden alla tio åren.",
    typ: "linje", paket: "WP2", fil: LINJE,
    kalla: { vy: "ar", sektion: "skr-tillganglighet", kpi: "kolada-u79049" },
    visning: "tid",
  },
  {
    namn: "linje-fasta",
    rubrik: "Linje med två fästa regioner",
    vad: "Stockholm och Skåne är fästa. De ritas i markeringsfärgerna, får etikett vid linjeslutet och visas som chips under grafen.",
    typ: "linje", paket: "WP2", fil: LINJE,
    kalla: { vy: "ar", sektion: "skr-tillganglighet", kpi: "kolada-n79198" },
    visning: "tid",
    fasta: ["0001", "0012"],
  },
  {
    namn: "rangordning",
    rubrik: "Rangordning",
    vad: "Telefontillgängligheten 2025: 19 regioner med värde, topp 3 avgränsad med en linje och riket som lodrät referens. Skåne och Västerbotten är fästa.",
    typ: "rangordning", paket: "WP3", fil: "charts/typer/rangordning.tsx",
    kalla: { vy: "ar", sektion: "skr-tillganglighet", kpi: "kolada-n79179" },
    visning: "rang",
    fasta: ["0012", "0024"],
  },
  {
    namn: "forvantat",
    rubrik: "Linje mot förväntat intervall",
    vad: "Beläggningsgraden per månad i akutflödet, med ett band för det förväntade intervallet och markerade punkter utanför.",
    typ: "linje", paket: "WP2", fil: LINJE,
    kalla: { vy: "manad", sektion: "akutflode", kpi: "belaggning" },
    visning: "tid",
  },
  {
    namn: "stapel",
    rubrik: "Stapel över tid",
    vad: "Besök på akutmottagningen per kvartal. Ett summamått med färre än 25 perioder ritas som staplar från noll.",
    typ: "stapel", paket: "WP3", fil: "charts/typer/stapel.tsx",
    kalla: { vy: "kvartal", sektion: "akutflode", kpi: "akutbesok" },
    visning: "tid",
  },
  {
    namn: "sma-multiplar",
    rubrik: "Små multiplar per sjukhus",
    vad: "Beläggningsgraden för de tre sjukhusen med delad skala och Region Halland som referens i varje panel.",
    typ: "smaMultiplar", paket: "WP3", fil: "charts/typer/smaMultiplar.tsx",
    kalla: { vy: "manad", sektion: "akutflode", kpi: "belaggning" },
    visning: "enheter",
  },
  {
    namn: "minidiagram",
    rubrik: "Minidiagram i översiktstabellen",
    vad: "Läget i korthet för kapitlet Tillgänglighet och väntetider: ett minidiagram per indikator, med egen skala per rad.",
    typ: "minidiagram", paket: "WP3", fil: "charts/typer/minidiagram.tsx",
    kalla: { vy: "ar", sektion: "skr-tillganglighet", kpi: "kolada-n79179" },
    visning: "tid",
  },
];

/** Exemplet med ett visst namn. */
export function exempel(namn: ExempelNamn): Exempel {
  const e = EXEMPEL.find((x) => x.namn === namn);
  if (!e) throw new Error(`Okänt exempel: ${namn}`);
  return e;
}

// ════════════════════════════════════════════════════════════
//  Rå v1-JSON (bara de fält galleriet läser)
// ════════════════════════════════════════════════════════════

interface RaPunkt {
  period: string; etikett: string; varde: number | null;
  yhat?: number; yhat_lower_80?: number; yhat_upper_80?: number; yhat_lower?: number; yhat_upper?: number;
  signal?: Status;
}
interface RaSerie { id: string; namn: string; tidsserie: RaPunkt[] }
interface RaUnderniva { id: string; namn: string; senaste: number | null; status?: Status; tidsserie: RaPunkt[] }
export interface RaKpi {
  id: string; namn: string; enhet: string; inverterad?: boolean; utan_mal?: boolean;
  senaste: number | null; status?: Status; rank?: number; rank_av?: number;
  analystext?: string; beskrivning?: string;
  kalla?: { namn: string; huvudman: string; url?: string };
  fakta?: { matt: string; riktning: string; avgransning: string; teori: string };
  tidsserie: RaPunkt[]; kontext_serier?: RaSerie[]; riket_serie?: RaPunkt[]; undernivaer?: RaUnderniva[];
}
export interface RaKapitel {
  id: string; namn: string; analys?: string; inledning?: string[];
  kpier: RaKpi[]; delar?: { id: string; namn: string; kpi_ids: string[] }[];
}

const FOKUS = "0013";
const RIKET = "0000";

// ════════════════════════════════════════════════════════════
//  Laddning
// ════════════════════════════════════════════════════════════

const RA = new Map<string, RaKapitel>();
const filnamn = (vy: VyId, sektion: string) => `${vy}-${sektion}`;

/** Hämtar datafilerna som exemplen behöver. Anropas en gång före renderingen. */
export async function laddaExempeldata(): Promise<void> {
  const filer = [...new Set(EXEMPEL.map((e) => filnamn(e.kalla.vy, e.kalla.sektion)))];
  await Promise.all(filer.map(async (f) => {
    if (RA.has(f)) return;
    const svar = await fetch(`${import.meta.env.BASE_URL}data/${f}.json`);
    if (!svar.ok) throw new Error(`Kunde inte hämta data/${f}.json (HTTP ${svar.status})`);
    RA.set(f, await svar.json() as RaKapitel);
  }));
}

/** Ett kapitel ur den laddade exempeldatan (rå v1-JSON). */
export function exempelKapitel(vy: VyId, sektion: string): RaKapitel {
  const k = RA.get(filnamn(vy, sektion));
  if (!k) throw new Error(`Exempeldata saknas för ${filnamn(vy, sektion)}: anropa laddaExempeldata() först`);
  return k;
}

function raKpi(kap: RaKapitel, kpiId: string): RaKpi {
  const k = kap.kpier.find((x) => x.id === kpiId);
  if (!k) throw new Error(`Indikatorn ${kpiId} saknas i ${kap.id}`);
  return k;
}

// ════════════════════════════════════════════════════════════
//  Spec
// ════════════════════════════════════════════════════════════

export type SpecKalla = "WP1" | "reserv";

export interface ExempelSpec {
  spec: ChartSpec;
  /** WP1 = normalisera + kpiTillSpec; reserv = galleriets egen spec ur v1-JSON. */
  kalla: SpecKalla;
  /** Felet från WP1 när reservspecen används, om det inte bara är "Ej byggd". */
  fel?: string;
}

/**
 * ChartSpec för ett galleriexempel. `kontext` ersätter exemplets utgångsläge,
 * t.ex. `{ fasta: ["0001"] }`. Kräver att laddaExempeldata() har körts.
 */
export function exempelSpec(namn: ExempelNamn, kontext: Partial<SpecKontext> = {}): ChartSpec {
  return exempelSpecMedKalla(namn, kontext).spec;
}

/** Som exempelSpec, men säger också om specen kommer från WP1 eller är galleriets reserv. */
export function exempelSpecMedKalla(namn: ExempelNamn, kontext: Partial<SpecKontext> = {}, kpiId?: string): ExempelSpec {
  const e = exempel(namn);
  const kap = exempelKapitel(e.kalla.vy, e.kalla.sektion);
  const kpi = raKpi(kap, kpiId ?? e.kalla.kpi);
  const ctx: SpecKontext = { vy: e.kalla.vy, fasta: e.fasta ?? [], fristaende: true, ...kontext };
  try {
    return { spec: specFranWp1(e, kap, kpi.id, ctx), kalla: "WP1" };
  } catch (fel) {
    const text = fel instanceof Error ? fel.message : String(fel);
    return {
      spec: reservSpec(e, kpi, ctx),
      kalla: "reserv",
      fel: /^Ej byggd/.test(text) ? undefined : text,
    };
  }
}

function specFranWp1(e: Exempel, raKap: RaKapitel, kpiId: string, ctx: SpecKontext): ChartSpec {
  const kap = normalisera(raKap, e.kalla.vy);
  const kpi = kap.kpier.find((k) => k.id === kpiId);
  if (!kpi) throw new Error(`normalisera gav ingen indikator ${kpiId}`);
  const spec = kpiTillSpec(kpi, kap, ctx, e.visning);
  if (e.typ !== "minidiagram") return spec;
  // Minidiagrammet har ingen egen visning i kpiTillSpec: tidsvisningens fokusserie
  // i minidiagrammets form (stilguiden 6.6).
  return {
    ...spec, typ: "minidiagram", hojdklass: "minidiagram", kicker: undefined,
    serier: spec.serier.filter((s) => s.roll === "fokus"), etiketter: [], jamforbara: undefined,
  };
}

// ── Reservspec ur v1-JSON ──

const ENHETSORD: Record<TalFormat["enhet"], string> = {
  procent: "procent", minuter: "minuter", antal: "antal", kronor: "kronor", kvot: "kvot", per_invanare: "per 100 000 invånare",
};
const TYPORD: Record<DiagramTyp, string> = {
  linje: "Linjediagram", rangordning: "Rangordning", stapel: "Stapeldiagram", smaMultiplar: "Små multiplar", minidiagram: "Minidiagram",
};
const NIVAORD: Partial<Record<VyId, string>> = { manad: "per månad", kvartal: "per kvartal", vecka: "per vecka", dag: "per dag" };

function talFormat(kpi: RaKpi): TalFormat {
  if (kpi.enhet === "procent") return { enhet: "procent", decimaler: 1, etikett: "%" };
  if (kpi.enhet === "minuter") return { enhet: "minuter", decimaler: 0, etikett: "min" };
  return { enhet: "antal", decimaler: 0, etikett: "" };
}

/** Alla perioder från första till sista i periodsteg, som ISO-datum. */
function periodRutnat(perioder: string[], vy: VyId): string[] {
  const sorterade = [...new Set(perioder)].sort();
  if (sorterade.length < 2) return sorterade;
  const ut: string[] = [];
  const [a, m, d] = sorterade[0].split("-").map(Number);
  const slut = sorterade[sorterade.length - 1];
  const t = new Date(Date.UTC(a, m - 1, d));
  for (let i = 0; i < 5000; i++) {
    const iso = t.toISOString().slice(0, 10);
    if (iso > slut) break;
    ut.push(iso);
    if (vy === "ar") t.setUTCFullYear(t.getUTCFullYear() + 1);
    else if (vy === "kvartal") t.setUTCMonth(t.getUTCMonth() + 3);
    else if (vy === "manad") t.setUTCMonth(t.getUTCMonth() + 1);
    else if (vy === "vecka") t.setUTCDate(t.getUTCDate() + 7);
    else t.setUTCDate(t.getUTCDate() + 1);
  }
  return ut;
}

/** Lägger en rå serie på rutnätet; saknade perioder blir null. */
function punkter(serie: RaPunkt[], rutnat: string[], vy: VyId): Punkt[] {
  const per = new Map(serie.map((p) => [p.period, p]));
  return rutnat.map((iso) => {
    const p = per.get(iso);
    const ut: Punkt = { period: iso, etikett: periodText(iso, vy, "axel"), varde: p?.varde ?? null };
    if (p?.yhat !== undefined) {
      Object.assign(ut, { yhat: p.yhat, lo80: p.yhat_lower_80, hi80: p.yhat_upper_80, lo95: p.yhat_lower, hi95: p.yhat_upper });
    }
    if (p?.signal) ut.signal = p.signal;
    return ut;
  });
}

const senasteVarde = (p: Punkt[]) => [...p].reverse().find((x) => x.varde !== null)?.varde ?? null;

/** Undertitelns måttbeskrivning: indikatorns namn som mening, aldrig beskrivningen med källhänvisning. */
const matt = (kpi: RaKpi) => kpi.namn.replace(/\s+[–-]\s+|\s*—\s*/g, ", ");
/** Första bokstaven gemen, för mått mitt i en mening. */
const liten = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function reservSpec(e: Exempel, kpi: RaKpi, ctx: SpecKontext): ChartSpec {
  const format = talFormat(kpi);
  const vy = e.kalla.vy;
  const fasta = ctx.fasta ?? [];
  const kalla = kpi.kalla ? { namn: `${kpi.kalla.namn}, ${kpi.kalla.huvudman}`, url: kpi.kalla.url } : undefined;
  const regioner: RaSerie[] = [{ id: FOKUS, namn: "Halland", tidsserie: kpi.tidsserie }, ...(kpi.kontext_serier ?? [])];
  const typ = e.typ;

  if (typ === "rangordning") return reservRangordning(e, kpi, regioner, fasta, format, kalla);

  // Tidsdiagram: linje, stapel, små multiplar, minidiagram
  const alla = [
    ...regioner.flatMap((r) => r.tidsserie),
    ...(kpi.riket_serie ?? []),
    ...(kpi.undernivaer ?? []).flatMap((u) => u.tidsserie),
  ];
  const rutnat = periodRutnat(alla.map((p) => p.period), vy);
  const spann = rutnat.length ? periodIntervall(rutnat[0], rutnat[rutnat.length - 1], vy, "kort") : "";
  const spannLopande = rutnat.length ? periodIntervall(rutnat[0], rutnat[rutnat.length - 1], vy, "lopande") : "";
  const fokus = punkter(kpi.tidsserie, rutnat, vy);
  const serier: SpecSerie[] = [];
  const etiketter: ChartSpec["etiketter"] = [];
  const noter: Not[] = [...(e.noter ?? [])];
  let titel = "Över tid";
  let undertitel = `${matt(kpi)}, ${ENHETSORD[format.enhet]}${NIVAORD[vy] ? ` ${NIVAORD[vy]}` : ""}. Region Halland, ${spann}.`;
  let paneler: ChartSpec["paneler"];
  let hojdklass: ChartSpec["hojdklass"] = "standard";
  let jamforbara: ChartSpec["jamforbara"];
  let yNoll = false;

  if (typ === "smaMultiplar") {
    const enheter = [...(kpi.undernivaer ?? [])].sort((a, b) => (b.senaste ?? -Infinity) - (a.senaste ?? -Infinity));
    titel = "Per sjukhus";
    undertitel = `${matt(kpi)}, ${ENHETSORD[format.enhet]}. ${antalOrd(enheter.length)} sjukhus, ${spann}.`;
    paneler = enheter.map((u) => ({ enhetId: u.id, titel: u.namn, status: u.status }));
    for (const u of enheter) {
      serier.push({ id: u.id, namn: u.namn, roll: "fokus", enhetId: u.id, punkter: punkter(u.tidsserie, rutnat, vy) });
    }
    // Andels- och medelmått: överordnad nivå som referens i varje panel (6.6)
    serier.push({ id: FOKUS, namn: "Region Halland", roll: "referens", enhetId: FOKUS, punkter: fokus });
    etiketter.push({ serieId: FOKUS, text: "Region Halland" });
    hojdklass = "kompakt";
  } else if (typ === "minidiagram") {
    serier.push({ id: FOKUS, namn: "Halland", roll: "fokus", enhetId: FOKUS, punkter: fokus });
    hojdklass = "minidiagram";
    titel = kpi.namn;
  } else if (typ === "stapel") {
    serier.push({ id: FOKUS, namn: "Halland", roll: "fokus", enhetId: FOKUS, punkter: fokus });
    yNoll = true;
  } else if (fokus.some((p) => p.yhat !== undefined) && !kpi.kontext_serier?.length) {
    // Linje mot förväntat intervall (ett band, 80 %)
    titel = "Mot förväntat intervall";
    serier.push({ id: FOKUS, namn: "Halland", roll: "fokus", enhetId: FOKUS, punkter: fokus });
    serier.push({
      id: "forvantat", namn: "Förväntat intervall", roll: "forvantat",
      intervall: fokus.filter((p) => p.lo80 !== undefined && p.hi80 !== undefined)
        .map((p) => ({ x: p.period, lo: p.lo80!, hi: p.hi80!, lo2: p.lo95, hi2: p.hi95 })),
    });
    etiketter.push({ serieId: "forvantat", text: "Förväntat intervall" });
  } else {
    // Linje med regioner: fokus, riket, fästa och övriga (6.4)
    titel = "Halland jämfört med övriga regioner";
    undertitel = `${matt(kpi)}, ${ENHETSORD[format.enhet]}. ${regioner.length} regioner och riket, ${spann}.`;
    serier.push({ id: FOKUS, namn: "Halland", roll: "fokus", enhetId: FOKUS, punkter: fokus });
    etiketter.push({ serieId: FOKUS, text: "Halland" });
    if (kpi.riket_serie?.length) {
      serier.push({ id: RIKET, namn: "Riket", roll: "referens", enhetId: RIKET, punkter: punkter(kpi.riket_serie, rutnat, vy) });
      etiketter.push({ serieId: RIKET, text: "Riket" });
    }
    const ovriga = (kpi.kontext_serier ?? []).map((r) => ({ r, p: punkter(r.tidsserie, rutnat, vy) }));
    for (const { r, p } of ovriga) {
      const i = fasta.indexOf(r.id);
      serier.push(i >= 0
        ? { id: r.id, namn: r.namn, roll: "markerad", enhetId: r.id, markeringIndex: i, punkter: p, interaktiv: true }
        : { id: r.id, namn: r.namn, roll: "kontext", enhetId: r.id, punkter: p, interaktiv: true });
      if (i >= 0) etiketter.push({ serieId: r.id, text: r.namn });
    }
    // Kontext: bara högsta och lägsta etiketteras (vid sista perioden med värde)
    const sist = rutnat[rutnat.length - 1];
    const medSista = ovriga.filter(({ r, p }) => !fasta.includes(r.id) && p[p.length - 1]?.period === sist && p[p.length - 1].varde !== null);
    if (medSista.length > 1) {
      const sorterade = [...medSista].sort((a, b) => b.p[b.p.length - 1].varde! - a.p[a.p.length - 1].varde!);
      etiketter.push({ serieId: sorterade[0].r.id, text: sorterade[0].r.namn });
      etiketter.push({ serieId: sorterade[sorterade.length - 1].r.id, text: sorterade[sorterade.length - 1].r.namn });
    }
    jamforbara = (kpi.kontext_serier ?? []).map((r) => ({ enhetId: r.id, namn: r.namn, senaste: senasteVarde(punkter(r.tidsserie, rutnat, vy)) }))
      .sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
  }

  // Luckor i fokusserien
  if (typ !== "smaMultiplar") {
    const forsta = fokus.findIndex((p) => p.varde !== null);
    const sista = fokus.length - 1 - [...fokus].reverse().findIndex((p) => p.varde !== null);
    const luckor = fokus.slice(forsta, sista + 1).filter((p) => p.varde === null).map((p) => periodText(p.period, vy, "kort"));
    if (luckor.length) noter.unshift({ typ: "lucka", text: `${oxford(luckor)} saknas för Halland.` });
  }

  const senaste = senasteVarde(fokus);
  const platsText = kpi.rank && kpi.rank_av ? `, ${plats(kpi.rank, kpi.rank_av)}` : "";
  const sammanfattning = `${TYPORD[typ]} som visar ${liten(matt(kpi))} för Halland ${spannLopande}. `
    + `Senaste värde ${vardeText(senaste, format, "lopande")}${platsText}.`;

  // Tabellen: en rad per serie, en kolumn per period (6.6 Tabell)
  const tabellserier = serier.filter((s) => s.punkter);
  const tabell: ChartSpec["tabell"] = {
    caption: titel,
    kolumner: [typ === "smaMultiplar" ? "Enhet" : "Region", ...rutnat.map((iso) => periodText(iso, vy, "kort"))],
    rader: tabellserier.map((s) => [s.namn, ...(s.punkter ?? []).map((p) => p.varde)]),
    fokusRad: tabellserier.findIndex((s) => s.roll === "fokus"),
  };

  return {
    id: `${e.namn}-${kpi.id}`, typ,
    kicker: ctx.fristaende && typ !== "minidiagram" ? kpi.namn : undefined,
    titel, undertitel, etiketter, jamforbara, serier, paneler,
    x: { typ: "tid", noll: false, format },
    y: { typ: "linjar", noll: yNoll, format, doman: typ === "smaMultiplar" ? doman(serier) : undefined },
    noter, kalla, sammanfattning: sammanfattning.slice(0, 200), tabell, hojdklass,
  };
}

function reservRangordning(e: Exempel, kpi: RaKpi, regioner: RaSerie[], fasta: string[], format: TalFormat, kalla: ChartSpec["kalla"]): ChartSpec {
  // Senaste perioden som Halland eller riket har, och regionerna med värde den perioden
  const sista = [...kpi.tidsserie, ...(kpi.riket_serie ?? [])].map((p) => p.period).sort().pop() ?? "";
  const vy = e.kalla.vy;
  const medVarde = regioner
    .map((r) => ({ r, v: r.tidsserie.find((p) => p.period === sista)?.varde ?? null }))
    .filter((x): x is { r: RaSerie; v: number } => x.v !== null)
    .sort((a, b) => (kpi.inverterad ? a.v - b.v : b.v - a.v));
  const serier: SpecSerie[] = medVarde.map(({ r, v }) => {
    const i = fasta.indexOf(r.id);
    if (r.id === FOKUS) return { id: r.id, namn: r.namn, roll: "fokus", enhetId: r.id, varde: v };
    return i >= 0
      ? { id: r.id, namn: r.namn, roll: "markerad", enhetId: r.id, markeringIndex: i, varde: v, interaktiv: true }
      : { id: r.id, namn: r.namn, roll: "kontext", enhetId: r.id, varde: v, interaktiv: true };
  });
  const riket = kpi.riket_serie?.find((p) => p.period === sista)?.varde;
  if (riket !== undefined && riket !== null) serier.push({ id: RIKET, namn: "Riket", roll: "referens", enhetId: RIKET, varde: riket });
  if (!kpi.utan_mal && medVarde.length > 3) serier.push({ id: "topp3", namn: "topp 3", roll: "grans", varde: medVarde[2].v });
  const ar = periodText(sista, vy, "kort");
  const titel = "Regionerna rangordnade";
  const hallandPlats = medVarde.findIndex((x) => x.r.id === FOKUS) + 1;
  return {
    id: `${e.namn}-${kpi.id}`, typ: "rangordning", kicker: kpi.namn,
    titel,
    undertitel: `${matt(kpi)}, ${ENHETSORD[format.enhet]}. ${medVarde.length} regioner med värde, ${ar}.`,
    etiketter: [{ serieId: FOKUS, text: "Halland" }, ...(riket !== undefined ? [{ serieId: RIKET, text: "Riket" }] : [])],
    jamforbara: regioner.filter((r) => r.id !== FOKUS)
      .map((r) => ({ enhetId: r.id, namn: r.namn, senaste: r.tidsserie.find((p) => p.period === sista)?.varde ?? null }))
      .sort((a, b) => a.namn.localeCompare(b.namn, "sv")),
    serier,
    x: { typ: "linjar", noll: false, format },
    y: { typ: "kategori", noll: false, format },
    noter: [], kalla,
    sammanfattning: (`Rangordning som visar ${liten(matt(kpi))} för regionerna ${ar}. `
      + `Halland har ${vardeText(kpi.senaste, format, "lopande")}, ${plats(hallandPlats, medVarde.length)}.`).slice(0, 200),
    tabell: {
      caption: titel,
      kolumner: ["Plats", "Region", ar],
      rader: medVarde.map(({ r, v }, i) => [i + 1, r.namn, v]),
      fokusRad: hallandPlats - 1,
    },
    hojdklass: "rangordning",
  };
}

function doman(serier: SpecSerie[]): [number, number] | undefined {
  const v = serier.flatMap((s) => (s.punkter ?? []).map((p) => p.varde)).filter((x): x is number => x !== null);
  return v.length ? [Math.min(...v), Math.max(...v)] : undefined;
}

const ANTAL = ["noll", "En", "Två", "Tre", "Fyra", "Fem", "Sex", "Sju", "Åtta", "Nio", "Tio", "Elva", "Tolv"];
const antalOrd = (n: number) => ANTAL[n] ?? String(n);

/** "2023 och 2024", "a, b och c". */
function oxford(lista: string[]): string {
  return lista.length < 2 ? lista.join("") : `${lista.slice(0, -1).join(", ")} och ${lista[lista.length - 1]}`;
}

// ════════════════════════════════════════════════════════════
//  Översiktstabellen (Läget i korthet, stilguiden 5.8)
// ════════════════════════════════════════════════════════════

export interface OversiktRad {
  kpiId: string;
  namn: string;
  senaste: string;
  /** Periodens text när den skiljer sig från kapitlets senaste period. */
  period?: string;
  plats?: string;
  status: Status | null;
  spec: ChartSpec;
  kalla: SpecKalla;
}

/** Översiktstabellens rader per avsnitt för minidiagramexemplet. */
export function oversiktExempel(): { avsnitt: string; rader: OversiktRad[] }[] {
  const e = exempel("minidiagram");
  const kap = exempelKapitel(e.kalla.vy, e.kalla.sektion);
  const kapitletsPeriod = kap.kpier.map((k) => k.tidsserie[k.tidsserie.length - 1]?.period ?? "").sort().pop();
  const grupper = kap.delar?.length ? kap.delar : [{ id: kap.id, namn: kap.namn, kpi_ids: kap.kpier.map((k) => k.id) }];
  return grupper.map((d) => ({
    avsnitt: d.namn,
    rader: d.kpi_ids.map((id) => {
      const kpi = raKpi(kap, id);
      const { spec, kalla } = exempelSpecMedKalla("minidiagram", {}, id);
      const sist = kpi.tidsserie[kpi.tidsserie.length - 1]?.period;
      return {
        kpiId: id, namn: kpi.namn,
        senaste: vardeText(kpi.senaste, talFormat(kpi)),
        period: sist && sist !== kapitletsPeriod ? periodText(sist, e.kalla.vy, "kort") : undefined,
        plats: kpi.rank && kpi.rank_av ? `${kpi.rank} av${HART}${kpi.rank_av}` : undefined,
        status: kpi.utan_mal ? null : kpi.status ?? null,
        spec, kalla,
      };
    }),
  }));
}

// ════════════════════════════════════════════════════════════
//  Riktigt innehåll till typografiproverna
// ════════════════════════════════════════════════════════════

/** Tar bort em dash ur text från datan (stilguiden 3.1): skrivs om till komma. */
export const utanEmDash = (s: string) => s.replace(/\s*—\s*/g, ", ");

/** De första `n` meningarna i en text. */
export function meningar(text: string, n: number): string {
  const delar = text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [text];
  return delar.slice(0, n).join("").trim();
}

export interface Innehall {
  kapitel: string;
  avsnitt: { nr: string; namn: string };
  indikator: { nr: string; namn: string };
  ingress: string;
  brod: string;
  figurtitel: string;
  nyckeltal: { varde: string; plats?: string; period: string };
  kalla: string;
  kicker: string;
}

/** Innehåll ur kapitlet Tillgänglighet och väntetider för typografiproverna. */
export function exempelInnehall(): Innehall {
  const e = exempel("spaghetti-luckor");
  const kap = exempelKapitel(e.kalla.vy, e.kalla.sektion);
  const kpi = raKpi(kap, e.kalla.kpi);
  const delIndex = Math.max(0, kap.delar?.findIndex((d) => d.kpi_ids.includes(kpi.id)) ?? 0);
  const del = kap.delar?.[delIndex];
  const kpiIndex = Math.max(0, del?.kpi_ids.indexOf(kpi.id) ?? 0);
  const sist = kpi.tidsserie[kpi.tidsserie.length - 1];
  const inledning = kap.inledning?.[1] ?? kap.inledning?.[0] ?? kap.analys ?? "";
  return {
    kapitel: kap.namn,
    avsnitt: { nr: String(delIndex + 1), namn: del?.namn ?? kap.namn },
    indikator: { nr: `${delIndex + 1}.${kpiIndex + 1}`, namn: kpi.namn },
    ingress: utanEmDash(meningar(inledning, 1)),
    brod: utanEmDash(meningar(kpi.analystext ?? kpi.fakta?.teori ?? "", 3)),
    figurtitel: exempelSpec("spaghetti-luckor").titel,
    nyckeltal: {
      varde: vardeText(kpi.senaste, talFormat(kpi)),
      plats: kpi.rank && kpi.rank_av ? plats(kpi.rank, kpi.rank_av) : undefined,
      period: sist ? periodText(sist.period, e.kalla.vy, "kort") : DASH,
    },
    kalla: kpi.kalla ? `Källa: ${kpi.kalla.namn}, ${kpi.kalla.huvudman}` : "",
    kicker: "Region Halland · Analys",
  };
}
