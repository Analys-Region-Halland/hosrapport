// export/graf.ts: figurens graf i PowerPoint, byggd ur ChartSpec (stilguiden
// 6.9). Ägare: WP12a.
//
// Två steg: `grafPlan` är en ren funktion från spec och ruta till en plan
// (nativa diagram, texter, linjer och former, i tum), och `ritaGraf` lägger
// planen på en bild. Planen kan därför testas utan pptxgenjs.
//
// Graferna är nativa PowerPoint-diagram så att mottagaren kan redigera dem och
// läsa datan i diagrammets tabell. Det som ett nativt diagram inte kan visa
// (namn vid linjeslut, slutpunkter, riket som lodrät linje, topp 3) ritas som
// former ovanpå. Det fungerar eftersom plotytan läggs ut manuellt
// (manualLayout, inner) och värdeaxeln har fast min, max och steg, så att
// varje värde har en känd plats på bilden. Ändrar någon datan i PowerPoint
// står formerna kvar där de var.
//
// Återgivning per graftyp (ATERGIVNING):
//   linje         Fokus, referens (streckad) och fästa serier som linjer, namn i
//                 seriens färg vid linjeslutet. Kontextserierna utelämnas och
//                 noten säger att de finns i webbrapporten. Förväntat intervall
//                 blir två tunna linjer (intervallets kanter) och punkter utanför
//                 markeras med triangel eller romb som på webben.
//   rangordning   Liggande stapel, sorterad bäst överst, Halland i fokusfärgen
//                 med värdet vid stapeln, fästa i markeringsfärgerna, övriga i
//                 kontextfärgen. Riket är en lodrät streckad linje, topp 3 en
//                 tunn linje under tredje raden.
//   stapel        Stående stapel från noll i fokusfärgen.
//   smaMultiplar  Ett litet linjediagram per enhet, högst sex per bild, delad
//                 skala. Referensen (överordnad nivå) streckad i varje panel.
//   minidiagram   Fokuslinjen utan axlar (används inte i decket; Läget i
//                 korthet saknar kolumnen Utveckling).

import type PptxGenJS from "pptxgenjs";
import { hogermarginal, placeraEtiketter, type EtikettUnderlag } from "../charts/karna/etiketter";
import { GEOMETRI } from "../charts/karna/geometri";
import { textbredd } from "../charts/karna/matt";
import { tickText, tidsaxel, vardeTicks } from "../charts/karna/skalor";
import type { ChartSpec, DiagramTyp, SpecSerie } from "../charts/spec";
import { NIVA_ORD } from "../charts/underlag";
import type { Punkt, TalFormat } from "../data/modell";
import { HART, period, varde } from "../design/format";
import { tema } from "../design/tema";
import { FARG, MINSTA_PT, PX_PER_TUM, SPRAK, TYPSNITT, linjebredd, roll, tum } from "./pptxTema";

// ════════════════════════════════════════════════════════════
//  Planens delar
// ════════════════════════════════════════════════════════════

/** En rektangel i tum. */
export interface Ruta { x: number; y: number; b: number; h: number }

export type Streck = "solid" | "dash";

export interface GrafSerie {
  namn: string;
  varden: (number | null)[];
  /** Hex utan #. */
  farg: string;
  /** Linjebredd i punkter. */
  bredd: number;
  streck: Streck;
}

export interface GrafDiagram {
  typ: "linje" | "stapel" | "liggande";
  ruta: Ruta;
  /** Inre plotytan som andelar av ramen (PowerPoints manualLayout, inner). */
  plot: { x: number; y: number; w: number; h: number };
  kategorier: string[];
  serier: GrafSerie[];
  /** Staplar: färg per stapel (en serie). */
  stapelFarger?: string[];
  /** Mellanrum mellan staplar i procent av stapelbredden. */
  stapelMellanrum?: number;
  varde: { min: number; max: number; steg: number; format: string; visa: boolean; rutnat: boolean };
  /** var = etikett var k:e kategori; streck = korta axelstreck (bara när de inte flyter ihop). */
  kategoriaxel: { visa: boolean; var: number; linje: string | null; streck: boolean };
  alt: string;
  namn: string;
}

export interface GrafText {
  text: string;
  ruta: Ruta;
  farg: string;
  fet: boolean;
  /** Punkter. */
  storlek: number;
  justering: "left" | "right" | "center";
  /** Ytans färg bakom texten, så att linjer under den inte skär genom (webbens halo). */
  halo?: boolean;
}

export interface GrafLinje {
  /** Brytpunkter i tum. */
  punkter: { x: number; y: number }[];
  farg: string;
  bredd: number;
  streck: Streck;
}

export interface GrafForm {
  form: "ellipse" | "triangle" | "diamond";
  ruta: Ruta;
  farg: string;
  /** Triangel som pekar nedåt. */
  vand?: boolean;
}

export interface GrafPlan {
  typ: DiagramTyp;
  atergivning: string;
  diagram: GrafDiagram[];
  texter: GrafText[];
  linjer: GrafLinje[];
  former: GrafForm[];
  /** Notens meningar (utan "Not:"), specens noter först. */
  noter: string[];
}

/** Hur varje graftyp återges i PowerPoint. */
export const ATERGIVNING: Record<DiagramTyp, string> = {
  linje: "Linjediagram: fokus, referens streckad och fästa serier med namn vid linjeslutet; övriga serier utelämnas; förväntat intervall som två tunna linjer.",
  rangordning: "Liggande stapel sorterad bäst överst: fokus i fokusfärgen med värde, fästa i markeringsfärgerna, referens som lodrät streckad linje och topp 3 som tunn linje.",
  stapel: "Stående stapel från noll i fokusfärgen.",
  smaMultiplar: "Ett linjediagram per enhet, högst sex per bild, med delad skala och referensen streckad i varje panel.",
  minidiagram: "Fokuslinjen utan axlar.",
};

/** Högst så här många paneler per bild (små multiplar). */
export const PANELER_PER_BILD = 6;

// ════════════════════════════════════════════════════════════
//  Gemensamt
// ════════════════════════════════════════════════════════════

const D = tema.diagram;
const NOT = roll("not");
const PANELTITEL = roll("granssnitt", true);

/** Seriens färg, bredd och streck enligt rollen (stilguiden 6.4). */
function stil(s: SpecSerie): { farg: string; bredd: number; streck: Streck } {
  switch (s.roll) {
    case "fokus": return { farg: FARG.diagram.fokus, bredd: linjebredd(D.roll.fokus.bredd), streck: "solid" };
    case "referens": return { farg: FARG.diagram.referens, bredd: linjebredd(D.roll.referens.bredd), streck: "dash" };
    case "markerad": return { farg: markeringsfarg(s), bredd: linjebredd(D.roll.markerad.bredd), streck: "solid" };
    case "grans": return { farg: FARG.diagram.grans, bredd: linjebredd(D.roll.grans.bredd), streck: "solid" };
    case "mal": return { farg: FARG.black, bredd: linjebredd(D.roll.mal.bredd), streck: "dash" };
    default: return { farg: FARG.diagram.kontext, bredd: linjebredd(D.roll.kontext.bredd), streck: "solid" };
  }
}

const markeringsfarg = (s: SpecSerie) => FARG.diagram.markering[(s.markeringIndex ?? 0) % FARG.diagram.markering.length];

/** Etikettens färg och vikt per roll: fokus och fästa i 600 i sin färg, referens i sin färg. */
function etikettStil(s: SpecSerie): { farg: string; fet: boolean } {
  if (s.roll === "fokus") return { farg: FARG.fokus, fet: true };
  if (s.roll === "markerad") return { farg: markeringsfarg(s), fet: true };
  if (s.roll === "referens") return { farg: FARG.diagram.referens, fet: false };
  return { farg: FARG.text3, fet: false };
}

/** PowerPoints talformat för värdeaxeln: tusental, decimaler och % eller kr i ticken (stilguiden 6.3). */
export function formatkod(f: TalFormat, decimaler: number): string {
  const tal = decimaler > 0 ? `#,##0.${"0".repeat(decimaler)}` : "#,##0";
  if (f.enhet === "procent") return `${tal}"${HART}%"`;
  if (f.enhet === "kronor") return `${tal}"${HART}kr"`;
  return tal;
}

/** Värdena för en serie på tidsaxelns perioder; luckor och undertryckta värden är null. */
function vardenPa(perioder: string[], punkter: Punkt[] | undefined): (number | null)[] {
  const per = new Map((punkter ?? []).map((p) => [p.period.slice(0, 10), p.undertryckt ? null : p.varde]));
  return perioder.map((p) => {
    const v = per.get(p);
    return v === undefined || v === null || !Number.isFinite(v) ? null : v;
  });
}

/** Sista index med värde, -1 om inget. */
function sista(v: (number | null)[]): number {
  for (let i = v.length - 1; i >= 0; i--) if (v[i] !== null) return i;
  return -1;
}

/** Index för värden som står ensamma mellan luckor (ritas som punkt, stilguiden 6.4). */
function ensamma(v: (number | null)[]): number[] {
  return v.flatMap((x, i) => (x !== null && (i === 0 || v[i - 1] === null) && (i === v.length - 1 || v[i + 1] === null) && v.length > 1 ? [i] : []));
}

/** Tickvärdenas största bredd i px. */
function tickBredd(ticks: number[], f: TalFormat, decimaler: number): number {
  return Math.max(0, ...ticks.map((t) => textbredd(tickText(t, f, decimaler))));
}

/** Var k:e kategorietikett så att etiketterna inte krockar. */
function etikettSteg(texter: string[], bandbredd: number): number {
  if (texter.length <= 1 || bandbredd <= 0) return 1;
  const bredast = Math.max(...texter.map((t) => textbredd(t))) + GEOMETRI.xEtikettLuft;
  return Math.max(1, Math.ceil(bredast / bandbredd));
}

/** Ram i px till ruta i tum, förskjuten till diagrammets läge. */
const tillTum = (ruta: Ruta, x: number, y: number, b: number, h: number): Ruta => ({
  x: ruta.x + tum(x), y: ruta.y + tum(y), b: tum(b), h: tum(h),
});

/** Text i diagrammets textstil (typ.roll.not), centrerad lodrätt kring y (px). */
function diagramText(ruta: Ruta, text: string, x: number, y: number, b: number, farg: string, fet: boolean, justering: GrafText["justering"], storlek = NOT.fontSize, maxHojd = Infinity): GrafText {
  const h = Math.min(maxHojd, Math.max(NOT.px * 1.4, (storlek / 0.75) * 1.4));
  return { text, ruta: tillTum(ruta, x, y - h / 2, b, h), farg, fet, storlek, justering };
}

/** Uppgifterna om plotytan i px, och skalor för kategori (band) och värde. */
interface Yta {
  bredd: number; hojd: number;
  x: number; y: number; b: number; h: number;
  min: number; max: number;
}
const yVarde = (y: Yta, v: number) => y.y + (y.h * (y.max - v)) / (y.max - y.min);
const xBand = (y: Yta, n: number, i: number) => y.x + ((i + 0.5) * y.b) / Math.max(1, n);
const xVarde = (y: Yta, v: number) => y.x + (y.b * (v - y.min)) / (y.max - y.min);

function diagramDel(typ: GrafDiagram["typ"], ruta: Ruta, yta: Yta, rest: Omit<GrafDiagram, "typ" | "ruta" | "plot">): GrafDiagram {
  const r = (v: number) => Math.round(v * 10000) / 10000;
  return {
    typ, ruta,
    plot: { x: r(yta.x / yta.bredd), y: r(yta.y / yta.hojd), w: r(yta.b / yta.bredd), h: r(yta.h / yta.hojd) },
    ...rest,
  };
}

function tomPlan(spec: ChartSpec): GrafPlan {
  return { typ: spec.typ, atergivning: ATERGIVNING[spec.typ], diagram: [], texter: [], linjer: [], former: [], noter: spec.noter.map((n) => n.text.trim()).filter(Boolean) };
}

/** Punkt (cirkel) med radie r px kring (x, y) px. */
const punkt = (ruta: Ruta, x: number, y: number, r: number, farg: string): GrafForm =>
  ({ form: "ellipse", ruta: tillTum(ruta, x - r, y - r, 2 * r, 2 * r), farg });

const tillTumPunkt = (ruta: Ruta, x: number, y: number) => ({ x: ruta.x + tum(x), y: ruta.y + tum(y) });

// ════════════════════════════════════════════════════════════
//  Linje (även förväntat intervall och minidiagram)
// ════════════════════════════════════════════════════════════

/** Axelstreck per kategori ritas bara när kategorierna är minst så här breda (px); annars flyter de ihop. */
const STRECK_MIN = tema.rum[1];

const VISADE_LINJER = new Set<SpecSerie["roll"]>(["fokus", "referens", "markerad", "mal"]);
/** Ritordning: referens och mål under fästa, fokus överst (stilguiden 6.4). */
const ORDNING: Record<string, number> = { mal: 0, referens: 1, markerad: 2, fokus: 3 };

interface LinjeVal {
  /** Axlar, rutnät och etiketter (falskt för minidiagram). */
  axlar: boolean;
  /** Delad domän (små multiplar). */
  doman?: [number, number];
  /** Smalt diagram: färre gridlinjer (stilguiden 6.3). */
  smal?: boolean;
  /** Etiketter vid linjeslut. */
  etiketter: boolean;
  /** Bara första och sista perioden på tidsaxeln (små multiplar). */
  andpunkter?: boolean;
  namn: string;
}

function linjePlan(spec: ChartSpec, ruta: Ruta, val: LinjeVal, plan: GrafPlan, serieurval?: (s: SpecSerie) => boolean): void {
  const axel = tidsaxel(spec);
  const perioder = axel.perioder;
  const n = perioder.length;
  const f = spec.y.format;
  const visade = spec.serier
    .filter((s) => VISADE_LINJER.has(s.roll) && s.punkter && (!serieurval || serieurval(s)))
    .sort((a, b) => ORDNING[a.roll] - ORDNING[b.roll]);
  const intervall = spec.serier.find((s) => s.roll === "forvantat" && s.intervall?.length);

  const varden = new Map(visade.map((s) => [s.id, vardenPa(perioder, s.punkter)]));
  const lo = intervall ? perioder.map((p) => intervall.intervall?.find((q) => q.x.slice(0, 10) === p)?.lo ?? null) : [];
  const hi = intervall ? perioder.map((p) => intervall.intervall?.find((q) => q.x.slice(0, 10) === p)?.hi ?? null) : [];

  // Värdeaxeln: ticks som omsluter det som visas (stilguiden 6.3)
  const alla = [...[...varden.values()].flat(), ...lo, ...hi].filter((v): v is number => v !== null);
  const [dmin, dmax] = val.doman ?? (alla.length ? [Math.min(...alla), Math.max(...alla)] : [0, 1]);
  const t = vardeTicks(dmin, dmax, val.smal ?? false, spec.y.noll);
  const min = t.ticks[0], max = t.ticks[t.ticks.length - 1];

  // Etiketter vid linjeslut: fokus, referens, fästa och intervallet (stilguiden 6.4)
  const etikettText = (s: SpecSerie) => spec.etiketter.find((e) => e.serieId === s.id)?.text;
  const etiketter = val.etiketter
    ? [
      ...visade.filter((s) => etikettText(s)).map((s) => ({ s, text: etikettText(s) as string, ...etikettStil(s) })),
      ...(intervall && spec.etiketter.some((e) => e.serieId === intervall.id)
        ? [{ s: intervall, text: etikettText(intervall) as string, farg: FARG.text3, fet: false }]
        : []),
    ]
    : [];

  // Plotytan i px
  const bredd = ruta.b * PX_PER_TUM, hojd = ruta.h * PX_PER_TUM;
  const vanster = val.axlar ? tickBredd(t.ticks, f, t.decimaler) + GEOMETRI.yKolumnLuft : 1;
  const hoger = val.axlar ? hogermarginal(etiketter.map((e) => ({ text: e.text, vikt: e.fet ? 600 : 400 })), bredd) : 2;
  const topp = val.axlar ? GEOMETRI.marginalTopp : 2;
  const botten = val.axlar ? GEOMETRI.axelrad : 2;
  const yta: Yta = { bredd, hojd, x: vanster, y: topp, b: Math.max(10, bredd - vanster - hoger), h: Math.max(10, hojd - topp - botten), min, max };

  const kategorier = perioder.map((p) => period(p, axel.vy, "axel"));
  const steg = val.andpunkter ? Math.max(1, n - 1) : etikettSteg(kategorier, yta.b / Math.max(1, n));

  // Serierna: intervallets kanter först (underst), sedan i ritordning
  const serier: GrafSerie[] = [];
  if (intervall) {
    const kant = { farg: FARG.diagram.grans, bredd: linjebredd(D.roll.grans.bredd), streck: "solid" as const };
    serier.push({ namn: "Förväntat intervall, nedre", varden: lo, ...kant }, { namn: "Förväntat intervall, övre", varden: hi, ...kant });
  }
  for (const s of visade) {
    const st = stil(s);
    serier.push({ namn: s.namn, varden: varden.get(s.id) ?? [], ...st, bredd: val.axlar ? st.bredd : linjebredd(tema.diagram.minidiagram.bredd) });
  }

  plan.diagram.push(diagramDel("linje", ruta, yta, {
    kategorier,
    serier,
    varde: { min, max, steg: t.steg, format: formatkod(f, t.decimaler), visa: val.axlar, rutnat: val.axlar },
    kategoriaxel: { visa: val.axlar, var: steg, linje: val.axlar ? FARG.diagram.rutnat : null, streck: val.axlar && yta.b / Math.max(1, n) >= STRECK_MIN },
    alt: spec.sammanfattning,
    namn: val.namn,
  }));

  // Punkter: slutpunkt för fokus, referens och fästa; ensamma fokusvärden (stilguiden 6.4)
  for (const s of visade) {
    const v = varden.get(s.id) ?? [];
    const i = sista(v);
    if (i < 0) continue;
    const r = !val.axlar ? tema.diagram.minidiagram.punktradie
      : s.roll === "fokus" ? D.roll.fokus.punktradie : s.roll === "referens" ? D.roll.referens.punktradie : s.roll === "markerad" ? D.roll.markerad.punktradie : 0;
    const farg = stil(s).farg;
    if (r > 0) plan.former.push(punkt(ruta, xBand(yta, n, i), yVarde(yta, v[i] as number), r, farg));
    if (s.roll === "fokus") {
      for (const j of ensamma(v)) if (j !== i) plan.former.push(punkt(ruta, xBand(yta, n, j), yVarde(yta, v[j] as number), D.roll.fokus.punktradieEnsam, farg));
    }
  }

  // Punkter utanför förväntat intervall: triangel (utanför 80 %) och romb (utanför 95 %).
  // Dag- och veckodata: bara romb (stilguiden 6.8, täta serier).
  if (intervall) {
    const fokus = visade.find((s) => s.roll === "fokus");
    const tata = axel.vy === "dag" || axel.vy === "vecka";
    const s7 = D.roll.forvantat.markor;
    fokus?.punkter?.forEach((p) => {
      const i = axel.index.get(p.period.slice(0, 10));
      if (i === undefined || p.varde === null || !p.signal || p.signal === "gron") return;
      if (p.signal === "gul" && tata) return;
      const x = xBand(yta, n, i), y = yVarde(yta, p.varde);
      if (p.signal === "rod") {
        plan.former.push({ form: "diamond", ruta: tillTum(ruta, x - s7, y - s7, 2 * s7, 2 * s7), farg: FARG.status.rod.markor });
      } else {
        const over = (hi[i] ?? Infinity) < p.varde;
        const b = s7 * 0.86;
        plan.former.push({ form: "triangle", ruta: tillTum(ruta, x - b, y - s7 * 0.8, 2 * b, s7 * 1.6), farg: FARG.status.gul.markor, vand: !over });
      }
    });
  }

  // Namn vid linjeslutet i en kolumn, med kopplingslinje (stilguiden 6.4)
  if (etiketter.length) {
    const xSista = xBand(yta, n, n - 1);
    const kolumn = xSista + D.etikett.kolumnAvstand;
    const underlag: (EtikettUnderlag & { ankarX: number })[] = [];
    etiketter.forEach((e, k) => {
      let ankarY: number, ankarI: number;
      if (e.s.roll === "forvantat") {
        ankarI = Math.max(sista(lo), sista(hi));
        if (ankarI < 0) return;
        ankarY = yVarde(yta, ((lo[ankarI] ?? hi[ankarI]) as number + ((hi[ankarI] ?? lo[ankarI]) as number)) / 2);
      } else {
        const v = varden.get(e.s.id) ?? [];
        ankarI = sista(v);
        if (ankarI < 0) return;
        ankarY = yVarde(yta, v[ankarI] as number);
      }
      underlag.push({
        serieId: e.s.id, text: e.text, ankarY, farg: e.farg, vikt: e.fet ? 600 : 400, interaktiv: false,
        prioritet: etiketter.length - k, ankarX: xBand(yta, n, ankarI) + D.kopplingslinje.start,
      });
    });
    const placerade = placeraEtiketter(underlag, yta.y, yta.y + yta.h, bredd);
    const k = D.kopplingslinje;
    for (const e of placerade) {
      plan.linjer.push({
        punkter: [
          tillTumPunkt(ruta, e.ankarX, e.ankarY),
          tillTumPunkt(ruta, xSista + k.knack, e.ankarY),
          tillTumPunkt(ruta, xSista + k.knack, e.y),
          tillTumPunkt(ruta, xSista + k.slut, e.y),
        ],
        farg: FARG.diagram.anslutning, bredd: linjebredd(k.bredd), streck: "solid",
      });
      const b = bredd - kolumn;
      e.rader.forEach((rad, j) => {
        const y = e.y + (j - (e.rader.length - 1) / 2) * D.etikett.minAvstand;
        plan.texter.push(diagramText(ruta, rad, kolumn, y, b, e.farg, e.vikt >= 600, "left"));
      });
    }
  }
}

function linjePlanFull(spec: ChartSpec, ruta: Ruta): GrafPlan {
  const plan = tomPlan(spec);
  linjePlan(spec, ruta, { axlar: true, etiketter: true, namn: spec.titel }, plan);
  // Kontextserierna kan inte återges läsbart i ett nativt diagram (stilguiden 6.9)
  if (spec.serier.some((s) => s.roll === "kontext")) {
    const niva = spec.jamforNiva ? NIVA_ORD[spec.jamforNiva.id].flera : NIVA_ORD.region.flera;
    plan.noter.push(`Övriga ${niva} finns i webbrapporten.`);
  }
  return plan;
}

// ════════════════════════════════════════════════════════════
//  Stapel över tid
// ════════════════════════════════════════════════════════════

function stapelPlan(spec: ChartSpec, ruta: Ruta): GrafPlan {
  const plan = tomPlan(spec);
  const axel = tidsaxel(spec);
  const perioder = axel.perioder;
  const n = perioder.length;
  const f = spec.y.format;
  const fokus = spec.serier.find((s) => s.roll === "fokus") ?? spec.serier[0];
  const v = vardenPa(perioder, fokus?.punkter);
  const alla = v.filter((x): x is number => x !== null);
  // Staplar börjar alltid på noll (stilguiden 6.3)
  const t = vardeTicks(alla.length ? Math.min(...alla) : 0, alla.length ? Math.max(...alla) : 1, false, true);
  const min = t.ticks[0], max = t.ticks[t.ticks.length - 1];
  const bredd = ruta.b * PX_PER_TUM, hojd = ruta.h * PX_PER_TUM;
  const vanster = tickBredd(t.ticks, f, t.decimaler) + GEOMETRI.yKolumnLuft;
  const yta: Yta = { bredd, hojd, x: vanster, y: GEOMETRI.marginalTopp, b: bredd - vanster - GEOMETRI.hogerMin, h: hojd - GEOMETRI.marginalTopp - GEOMETRI.axelrad, min, max };
  const kategorier = perioder.map((p) => period(p, axel.vy, "axel"));
  plan.diagram.push(diagramDel("stapel", ruta, yta, {
    kategorier,
    serier: [{ namn: fokus?.namn ?? "", varden: v, farg: FARG.diagram.fokus, bredd: 0, streck: "solid" }],
    stapelFarger: [FARG.diagram.fokus],
    // stapelbredd = breddPerMellanrum × mellanrum (stilguiden 6.6)
    stapelMellanrum: Math.round(100 / D.stapel.breddPerMellanrum),
    varde: { min, max, steg: t.steg, format: formatkod(f, t.decimaler), visa: true, rutnat: true },
    kategoriaxel: { visa: true, var: etikettSteg(kategorier, yta.b / Math.max(1, n)), linje: FARG.diagram.nollinje, streck: false },
    alt: spec.sammanfattning,
    namn: spec.titel,
  }));
  return plan;
}

// ════════════════════════════════════════════════════════════
//  Rangordning: liggande stapel
// ════════════════════════════════════════════════════════════

type RadSerie = SpecSerie & { varde: number };
const RADROLLER = new Set<SpecSerie["roll"]>(["fokus", "kontext", "markerad"]);
const harVarde = (s: SpecSerie): s is RadSerie => s.varde !== undefined && Number.isFinite(s.varde);

/** Minsta radhöjd i px i rangordningen: namnen (typ.roll.not) får inte gå in i varandra. */
export const RANG_RAD_MIN = tema.typ.roll.not.storlek + 1;
/** Med högst så här många rader står värdet vid varje stapel (webben visar övriga värden vid hovring). */
const RANG_ALLA_VARDEN = 8;

/** Rangordningens luft ovanför och under plotytan i px: referensens etikett och värdeaxeln. */
const rangLuft = (spec: ChartSpec) => (spec.serier.some((s) => s.roll === "referens" && harVarde(s)) ? tema.rum[5] : GEOMETRI.marginalTopp) + GEOMETRI.axelrad;

function rangPlan(spec: ChartSpec, ruta: Ruta): GrafPlan {
  const plan = tomPlan(spec);
  // Värdeaxeln är vågrät i rangordningen
  const f = spec.x.format;
  const rader = spec.serier.filter((s): s is RadSerie => RADROLLER.has(s.roll) && harVarde(s));
  const ref = spec.serier.find((s): s is RadSerie => s.roll === "referens" && harVarde(s));
  const grans = spec.serier.find((s): s is RadSerie => s.roll === "grans" && harVarde(s));
  const n = rader.length;
  const varden = [...rader.map((r) => r.varde), ...(ref ? [ref.varde] : [])];
  // Staplar börjar på noll (stilguiden 6.3)
  const t = vardeTicks(Math.min(0, ...varden), Math.max(0, ...varden), false, true);
  const min = t.ticks[0], max = t.ticks[t.ticks.length - 1];

  // Värdet står vid fokus och fästa; vid få rader vid alla
  const allaVarden = n <= RANG_ALLA_VARDEN;
  const medVarde = (r: RadSerie) => allaVarden || r.roll === "fokus" || r.roll === "markerad";
  const vardetext = (r: RadSerie) => varde(r.varde, f);
  const toppText = grans ? spec.etiketter.find((e) => e.serieId === grans.id)?.text ?? grans.namn : "";

  const bredd = ruta.b * PX_PER_TUM, hojd = ruta.h * PX_PER_TUM;
  // Luft för PowerPoints egen textmätning: ett namn som inte ryms bryts på två rader
  const namnBredd = Math.min(bredd * D.rangordning.namnMaxAndel, Math.max(0, ...rader.map((r) => textbredd(r.namn) * 1.1 + tema.rum[1])));
  const hoger = Math.max(GEOMETRI.hogerMin,
    ...rader.filter(medVarde).map((r) => textbredd(vardetext(r), 600) + tema.rum[2]),
    grans ? textbredd(toppText, 400, tema.typ.minsta) + tema.rum[2] : 0);
  const topp = ref ? tema.rum[5] : GEOMETRI.marginalTopp;
  const vanster = namnBredd + GEOMETRI.yKolumnLuft;
  const yta: Yta = { bredd, hojd, x: vanster, y: topp, b: bredd - vanster - hoger, h: hojd - rangLuft(spec), min, max };

  // PowerPoint ritar första kategorin nederst: omvänd ordning ger bäst överst.
  const omvanda = [...rader].reverse();
  const farg = (r: RadSerie) => (r.roll === "fokus" ? FARG.diagram.fokus : r.roll === "markerad" ? markeringsfarg(r) : FARG.diagram.kontext);
  plan.diagram.push(diagramDel("liggande", ruta, yta, {
    kategorier: omvanda.map((r) => r.namn),
    serier: [{ namn: spec.tabell.kolumner[spec.tabell.kolumner.length - 1] ?? "Värde", varden: omvanda.map((r) => r.varde), farg: FARG.diagram.kontext, bredd: 0, streck: "solid" }],
    stapelFarger: omvanda.map(farg),
    stapelMellanrum: Math.round(100 / D.stapel.breddPerMellanrum),
    varde: { min, max, steg: t.steg, format: formatkod(f, t.decimaler), visa: true, rutnat: true },
    kategoriaxel: { visa: true, var: 1, linje: FARG.diagram.nollinje, streck: false },
    alt: spec.sammanfattning,
    namn: spec.titel,
  }));

  const radH = yta.h / Math.max(1, n);
  const radY = (i: number) => yta.y + (i + 0.5) * radH;
  // Värdet vid stapeln: fokus och fästa i 600 i sin färg (stilguiden 6.6), övriga i farg.text2
  rader.forEach((r, i) => {
    if (!medVarde(r)) return;
    const slut = xVarde(yta, r.varde);
    const noll = xVarde(yta, 0);
    const text = vardetext(r);
    const markerad = r.roll === "fokus" || r.roll === "markerad";
    const b = textbredd(text, markerad ? 600 : 400) + tema.rum[1];
    const x = r.varde >= 0 ? Math.max(slut, noll) + tema.rum[1] : Math.min(slut, noll) - tema.rum[1] - b;
    const t = diagramText(ruta, text, x, radY(i), b, markerad ? farg(r) : FARG.text2, markerad, r.varde >= 0 ? "left" : "right", NOT.fontSize, radH);
    plan.texter.push({ ...t, halo: true });
  });

  // Referensen: lodrät streckad linje med namn och värde ovanför plotytan
  if (ref) {
    const x = xVarde(yta, ref.varde);
    const st = stil(ref);
    plan.linjer.push({ punkter: [tillTumPunkt(ruta, x, yta.y), tillTumPunkt(ruta, x, yta.y + yta.h)], farg: st.farg, bredd: st.bredd, streck: "dash" });
    const text = `${spec.etiketter.find((e) => e.serieId === ref.id)?.text ?? ref.namn} ${vardetext(ref)}`;
    const b = textbredd(text) + tema.rum[2];
    const xText = Math.min(Math.max(0, x - b / 2), bredd - b);
    plan.texter.push(diagramText(ruta, text, xText, yta.y - tema.rum[3], b, st.farg, false, "center"));
  }

  // Topp 3: tunn linje under sista raden inom topp 3, "topp 3" i högermarginalen
  if (grans && grans.varde > 0 && grans.varde < n) {
    const y = yta.y + (grans.varde * yta.h) / n;
    const st = stil(grans);
    plan.linjer.push({ punkter: [tillTumPunkt(ruta, yta.x, y), tillTumPunkt(ruta, yta.x + yta.b + tema.rum[1], y)], farg: st.farg, bredd: st.bredd, streck: "solid" });
    const b = textbredd(toppText, 400, tema.typ.minsta) + tema.rum[1];
    // Ovanför linjen, så att värdet på raden under står fritt
    plan.texter.push(diagramText(ruta, toppText, yta.x + yta.b + tema.rum[2], y - tema.typ.minsta * 0.6, b, FARG.diagram.grans, false, "left", MINSTA_PT));
  }
  return plan;
}

/**
 * Minsta höjd i tum som grafen behöver för att vara läsbar. Rangordningen
 * behöver en rad per region; övriga typer klarar sig med det som blir över.
 */
export function minstaHojd(spec: ChartSpec): number {
  if (spec.typ !== "rangordning") return 0;
  const rader = spec.serier.filter((s) => RADROLLER.has(s.roll) && harVarde(s)).length;
  return tum(rader * RANG_RAD_MIN + rangLuft(spec));
}

// ════════════════════════════════════════════════════════════
//  Små multiplar
// ════════════════════════════════════════════════════════════

/** Antal bilder som små multiplar behöver (högst sex paneler per bild). */
export function panelsidor(spec: ChartSpec): number {
  return spec.typ === "smaMultiplar" ? Math.max(1, Math.ceil((spec.paneler?.length ?? 0) / PANELER_PER_BILD)) : 1;
}

function panelPlan(spec: ChartSpec, ruta: Ruta, sida: number): GrafPlan {
  const plan = tomPlan(spec);
  const paneler = (spec.paneler ?? []).slice(sida * PANELER_PER_BILD, (sida + 1) * PANELER_PER_BILD);
  const ref = spec.serier.find((s) => s.roll === "referens");
  const antal = Math.max(1, paneler.length);
  const kolumner = Math.min(3, antal);
  const radantal = Math.ceil(antal / kolumner);
  const luftX = tum(tema.rum[5]), luftY = tum(tema.rum[4]);
  const pb = (ruta.b - (kolumner - 1) * luftX) / kolumner;
  const ph = (ruta.h - (radantal - 1) * luftY) / radantal;
  const titelH = PANELTITEL.radhojd;
  const f = spec.y.format;

  paneler.forEach((p, i) => {
    const k = i % kolumner, r = Math.floor(i / kolumner);
    const x = ruta.x + k * (pb + luftX), y = ruta.y + r * (ph + luftY);
    const egen = spec.serier.find((s) => s.roll === "fokus" && s.enhetId === p.enhetId);
    const v = egen?.punkter ? [...egen.punkter].reverse().find((q) => q.varde !== null && !q.undertryckt)?.varde ?? null : null;
    plan.texter.push({ text: p.titel, ruta: { x, y, b: pb * 0.62, h: titelH }, farg: FARG.black, fet: true, storlek: PANELTITEL.fontSize, justering: "left" });
    plan.texter.push({ text: varde(v, f), ruta: { x: x + pb * 0.62, y, b: pb * 0.38, h: titelH }, farg: FARG.text2, fet: false, storlek: PANELTITEL.fontSize, justering: "right" });
    linjePlan(spec, { x, y: y + titelH, b: pb, h: ph - titelH }, {
      axlar: true, etiketter: false, smal: true, andpunkter: true, namn: `${spec.titel}: ${p.titel}`,
      ...(spec.y.doman ? { doman: spec.y.doman } : {}),
    }, plan, (s) => s === egen || s === ref);
  });
  if (ref) plan.noter.push(`Den streckade linjen i varje panel är ${spec.etiketter.find((e) => e.serieId === ref.id)?.text ?? ref.namn}.`);
  const sidor = panelsidor(spec);
  if (sidor > 1) plan.noter.push(`Panel ${sida * PANELER_PER_BILD + 1}–${sida * PANELER_PER_BILD + paneler.length} av ${spec.paneler?.length ?? 0}.`);
  return plan;
}

// ════════════════════════════════════════════════════════════
//  Ingång
// ════════════════════════════════════════════════════════════

/**
 * Planen för en graf i rutan (tum). `sida` väljer panelerna i små multiplar
 * (0 = de sex första); övriga typer har en sida.
 */
export function grafPlan(spec: ChartSpec, ruta: Ruta, sida = 0): GrafPlan {
  switch (spec.typ) {
    case "linje": return linjePlanFull(spec, ruta);
    case "stapel": return stapelPlan(spec, ruta);
    case "rangordning": return rangPlan(spec, ruta);
    case "smaMultiplar": return panelPlan(spec, ruta, sida);
    case "minidiagram": {
      const plan = tomPlan(spec);
      linjePlan(spec, ruta, { axlar: false, etiketter: false, namn: spec.titel }, plan);
      return plan;
    }
  }
}

// ════════════════════════════════════════════════════════════
//  Rita planen på en bild
// ════════════════════════════════════════════════════════════

const axeltext = { fontFace: TYPSNITT.sans, fontSize: NOT.fontSize, color: FARG.diagram.axeltext };

/** Ett nativt diagram. Linjer läggs som en grupp per serie så att varje serie får egen bredd och streckning. */
function ritaDiagram(slide: PptxGenJS.Slide, d: GrafDiagram): void {
  const gemensamt: PptxGenJS.IChartOpts = {
    x: d.ruta.x, y: d.ruta.y, w: d.ruta.b, h: d.ruta.h,
    objectName: d.namn.slice(0, 120),
    altText: d.alt,
    layout: d.plot,
    showLegend: false,
    showTitle: false,
    displayBlanksAs: "gap",
    // Ingen yta och ingen ram runt diagrammet (stilguiden 6.1: platta utan ram)
    chartArea: { roundedCorners: false },
    // Värdeaxeln: fast skala så att formerna ovanpå hamnar rätt
    valAxisMinVal: d.varde.min,
    valAxisMaxVal: d.varde.max,
    valAxisMajorUnit: d.varde.steg,
    valAxisLabelFormatCode: d.varde.format,
    valAxisHidden: !d.varde.visa,
    valAxisLineShow: false,
    valAxisMajorTickMark: "none",
    valAxisLabelFontFace: axeltext.fontFace,
    valAxisLabelFontSize: axeltext.fontSize,
    valAxisLabelColor: axeltext.color,
    valGridLine: d.varde.rutnat
      ? { color: FARG.diagram.rutnat, size: linjebredd(D.rutnat.bredd), style: "dash" }
      : { style: "none" },
    catGridLine: { style: "none" },
    catAxisHidden: !d.kategoriaxel.visa,
    catAxisLabelFrequency: String(d.kategoriaxel.var),
    catAxisLabelPos: "low",
    catAxisLabelFontFace: axeltext.fontFace,
    catAxisLabelFontSize: axeltext.fontSize,
    catAxisLabelColor: axeltext.color,
    catAxisLineShow: d.kategoriaxel.linje !== null,
    catAxisLineColor: d.kategoriaxel.linje ?? FARG.diagram.rutnat,
    catAxisLineSize: linjebredd(d.typ === "linje" ? D.xAxel.baslinje : D.nollinje),
    // Korta axelstreck nedåt på tidsaxeln (stilguiden 6.3): pptxgenjs förval "out"
    ...(d.kategoriaxel.streck ? {} : { catAxisMajorTickMark: "none" as const }),
    dataLabelColor: FARG.black,
    dataLabelFontFace: TYPSNITT.sans,
    lang: SPRAK,
  };

  if (d.typ === "linje") {
    const typer: PptxGenJS.IChartMulti[] = d.serier.map((s) => ({
      type: "line",
      data: [{ name: s.namn, labels: d.kategorier, values: s.varden as number[] }],
      options: {
        chartColors: [s.farg],
        lineSize: s.bredd,
        lineDash: s.streck === "dash" ? "dash" : "solid",
        lineDataSymbol: "none",
        lineSmooth: false,
      },
    }));
    // Kombinerade diagram tar inställningarna som andra argument (pptxgenjs läser `data || opt`)
    const opts: PptxGenJS.IChartOpts = { ...gemensamt, lineDataSymbol: "none", lineDataSymbolLineColor: d.serier[0]?.farg ?? FARG.diagram.fokus };
    slide.addChart(typer, opts as unknown as never[]);
    return;
  }

  const s = d.serier[0];
  const farger = d.stapelFarger ?? [s.farg];
  slide.addChart("bar", [{ name: s.namn, labels: d.kategorier, values: s.varden as number[] }], {
    ...gemensamt,
    barDir: d.typ === "liggande" ? "bar" : "col",
    // Fler än en färg ger färg per stapel; en färg upprepas så att pptxgenjs inte faller tillbaka på sina egna
    chartColors: farger.length > 1 ? farger : [farger[0], farger[0]],
    barGapWidthPct: d.stapelMellanrum ?? 50,
  });
}

/** Lägger planen på bilden: diagram, sedan linjer, former och texter ovanpå. */
export function ritaGraf(slide: PptxGenJS.Slide, plan: GrafPlan): void {
  for (const d of plan.diagram) ritaDiagram(slide, d);
  for (const l of plan.linjer) {
    const xs = l.punkter.map((p) => p.x), ys = l.punkter.map((p) => p.y);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    const b = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
    // custGeom saknas i pptxgenjs typer men finns i biblioteket
    slide.addShape("custGeom" as PptxGenJS.SHAPE_NAME, {
      x: x0, y: y0, w: Math.max(b, 0.001), h: Math.max(h, 0.001),
      points: l.punkter.map((p, i) => (i === 0 ? { x: p.x - x0, y: p.y - y0, moveTo: true } : { x: p.x - x0, y: p.y - y0 })),
      line: { color: l.farg, width: l.bredd, dashType: l.streck === "dash" ? "dash" : "solid" },
    });
  }
  for (const f of plan.former) {
    slide.addShape(f.form, {
      x: f.ruta.x, y: f.ruta.y, w: f.ruta.b, h: f.ruta.h,
      fill: { color: f.farg },
      line: { type: "none" },
      ...(f.vand ? { flipV: true } : {}),
    });
  }
  for (const t of plan.texter) {
    slide.addText(t.text, {
      x: t.ruta.x, y: t.ruta.y, w: t.ruta.b, h: t.ruta.h,
      fontFace: TYPSNITT.sans, fontSize: t.storlek, bold: t.fet, color: t.farg,
      align: t.justering, valign: "middle", margin: [0, 0, 0, 0], wrap: false, lang: SPRAK,
      ...(t.halo ? { fill: { color: FARG.yta } } : {}),
    });
  }
}
