// exempel.ts: exempeldata för den levande stilguiden. Galleriets exempel
// (docs/arkitektur.md WP7), deras ChartSpec, översiktstabellens rader och riktigt
// innehåll till typografiproverna. Ägare: WP7.
//
// Graferna byggs med WP1:s kpiTillSpec (och minidiagramSpec) på WP1:s fixturer:
// utdrag ur verklig data (skrUtdrag, akutflodeUtdrag) och en påhittad hierarki
// (hierarki). Fixturerna är synkrona och ändras inte när R kör om, så exemplen
// och bänkens bilder av dem står still tills koden ändras.
//
// Översiktstabellen och typografiproverna visar ett helt kapitel ur rapporten
// (laddaKapitel, public/data). laddaExempeldata() hämtar det; tills dess, eller
// om hämtningen misslyckas, används SKR-utdraget.
//
// Användning i en sektion (WP2, WP3):
//   import { exempelSpec } from "./exempel";
//   <Figur spec={exempelSpec("spaghetti-luckor")} rubrikniva={4} />
//   exempelSpec("linje-fasta", { fasta: ["0001"] })      annat utgångsläge
//   exempelSpec("spaghetti-luckor", {}, "rang")           annan visning

import { kpiTillSpec, minidiagramSpec, visningar } from "../../src/charts/kpiTillSpec";
import type { ChartSpec, DiagramTyp, SpecKontext, VisningId } from "../../src/charts/spec";
import { akutflodeUtdrag, hierarki, skrUtdrag } from "../../src/data/fixturer";
import { laddaKapitel } from "../../src/data/laddning";
import type { Enhet, KapitelModell, KpiModell, Status, VyId } from "../../src/data/modell";
import { DASH, HART, period as periodText, plats, varde as vardeText } from "../../src/design/format";

// ════════════════════════════════════════════════════════════
//  Datakällor
// ════════════════════════════════════════════════════════════

export type Fixtur = "skr" | "akutflode" | "hierarki";

/** WP1:s fixturer (src/data/fixturer/index.ts) med sin tidsupplösning. */
export const FIXTURER: Record<Fixtur, { namn: string; vy: VyId; kap: () => KapitelModell }> = {
  skr: { namn: "skrUtdrag()", vy: "ar", kap: skrUtdrag },
  akutflode: { namn: "akutflodeUtdrag()", vy: "manad", kap: akutflodeUtdrag },
  hierarki: { namn: "hierarki()", vy: "manad", kap: hierarki },
};

const cache = new Map<Fixtur, KapitelModell>();
function fixtur(f: Fixtur): KapitelModell {
  let k = cache.get(f);
  if (!k) { k = FIXTURER[f].kap(); cache.set(f, k); }
  return k;
}

/** Kapitlet som översiktstabellen och typografin visar (public/data). */
export const RAPPORTKAPITEL = { vy: "ar" as VyId, id: "skr-tillganglighet" };
let rapportkapitel: KapitelModell | null = null;

/** Hämtar rapportkapitlet. Exemplen med fixturer behöver ingen laddning. */
export async function laddaExempeldata(): Promise<void> {
  rapportkapitel = await laddaKapitel(RAPPORTKAPITEL.vy, RAPPORTKAPITEL.id);
}

/** Rapportkapitlet om det är laddat, annars SKR-utdraget, och vilket det blev. */
export function exempelKapitel(): { kap: KapitelModell; vy: VyId; kalla: string } {
  return rapportkapitel
    ? { kap: rapportkapitel, vy: RAPPORTKAPITEL.vy, kalla: `data/${RAPPORTKAPITEL.vy}-${RAPPORTKAPITEL.id}.json` }
    : { kap: fixtur("skr"), vy: FIXTURER.skr.vy, kalla: `fixturer ${FIXTURER.skr.namn}` };
}

// ════════════════════════════════════════════════════════════
//  Exemplen
// ════════════════════════════════════════════════════════════

export type ExempelNamn =
  | "spaghetti-luckor"
  | "spaghetti-hel"
  | "linje-fasta"
  | "rangordning"
  | "rangordning-lika"
  | "forvantat"
  | "stapel"
  | "sma-multiplar"
  | "sma-multiplar-avdelning"
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
  /** Fixtur och indikator. Minidiagrammet visar hela rapportkapitlet i stället. */
  data: { fixtur: Fixtur; kpi: string };
  visning: VisningId;
  /** Exemplets utgångsläge: fästa enheter, fokus för nedborrning. */
  kontext?: Partial<SpecKontext>;
}

const LINJE = "charts/typer/linje.tsx";

export const EXEMPEL: readonly Exempel[] = [
  {
    namn: "spaghetti-luckor",
    rubrik: "Linje med alla regioner, luckor och seriebrott",
    vad: "Telefontillgängligheten med 21 regioner och riket. Halland saknar värden 2023 och 2024, och källan byttes 2024.",
    typ: "linje", paket: "WP2", fil: LINJE,
    data: { fixtur: "skr", kpi: "kolada-n79179" }, visning: "tid",
  },
  {
    namn: "spaghetti-hel",
    rubrik: "Linje med alla regioner, utan luckor",
    vad: "Kontaktsjuksköterska vid bröstcancer, där alla 21 regioner och riket har värden alla tio åren och ligger tätt.",
    typ: "linje", paket: "WP2", fil: LINJE,
    data: { fixtur: "skr", kpi: "kolada-u79063" }, visning: "tid",
  },
  {
    namn: "linje-fasta",
    rubrik: "Linje med två fästa regioner",
    vad: "Strukturjusterad kostnad i kronor. Stockholm och Skåne är fästa: de ritas i markeringsfärgerna, får etikett vid linjeslutet och visas som chips.",
    typ: "linje", paket: "WP2", fil: LINJE,
    data: { fixtur: "skr", kpi: "kolada-u70020" }, visning: "tid",
    kontext: { fasta: ["0001", "0012"] },
  },
  {
    namn: "rangordning",
    rubrik: "Rangordning",
    vad: "Telefontillgängligheten 2025: 19 regioner med värde, topp 3 avgränsad och riket som referens. Skåne och Västerbotten är fästa.",
    typ: "rangordning", paket: "WP3", fil: "charts/typer/rangordning.tsx",
    data: { fixtur: "skr", kpi: "kolada-n79179" }, visning: "rang",
    kontext: { fasta: ["0012", "0024"] },
  },
  {
    namn: "rangordning-lika",
    rubrik: "Rangordning med lika värden",
    vad: "Kontaktsjuksköterska vid bröstcancer 2025, där Halland delar avrundat värde med en annan region. Lika värden får samma plats.",
    typ: "rangordning", paket: "WP3", fil: "charts/typer/rangordning.tsx",
    data: { fixtur: "skr", kpi: "kolada-u79063" }, visning: "rang",
  },
  {
    namn: "forvantat",
    rubrik: "Linje mot förväntat intervall",
    vad: "Beläggningsgraden per månad i akutflödet, med ett band för det förväntade intervallet och markerade punkter utanför.",
    typ: "linje", paket: "WP2", fil: LINJE,
    data: { fixtur: "akutflode", kpi: "belaggning" }, visning: "tid",
  },
  {
    namn: "stapel",
    rubrik: "Stapel över tid",
    vad: "Besök på akutmottagningen per månad. Ett summamått med högst 24 perioder och utan regioner ritas som staplar från noll.",
    typ: "stapel", paket: "WP3", fil: "charts/typer/stapel.tsx",
    data: { fixtur: "akutflode", kpi: "akutbesok" }, visning: "tid",
  },
  {
    namn: "sma-multiplar",
    rubrik: "Små multiplar per sjukhus",
    vad: "Beläggningsgraden för de tre sjukhusen med delad skala och Region Halland som referens i varje panel.",
    typ: "smaMultiplar", paket: "WP3", fil: "charts/typer/smaMultiplar.tsx",
    data: { fixtur: "akutflode", kpi: "belaggning" }, visning: "enheter",
  },
  {
    namn: "sma-multiplar-avdelning",
    rubrik: "Små multiplar per avdelning",
    vad: "Påhittad hierarki: återinskrivningar för avdelningarna på sjukhuset i Halmstad, med brödsmula och sjukhuset som referens. Klick på en panel borrar ned.",
    typ: "smaMultiplar", paket: "WP3", fil: "charts/typer/smaMultiplar.tsx",
    data: { fixtur: "hierarki", kpi: "demo-aterinskrivning" }, visning: "enheter",
    kontext: { fokus: "halmstad" },
  },
  {
    namn: "minidiagram",
    rubrik: "Minidiagram i översiktstabellen",
    vad: "Läget i korthet för ett helt kapitel: ett minidiagram per indikator, med egen skala per rad.",
    typ: "minidiagram", paket: "WP3", fil: "charts/typer/minidiagram.tsx",
    data: { fixtur: "skr", kpi: "kolada-n79179" }, visning: "tid",
  },
];

/** Exemplet med ett visst namn. */
export function exempel(namn: ExempelNamn): Exempel {
  const e = EXEMPEL.find((x) => x.namn === namn);
  if (!e) throw new Error(`Okänt exempel: ${namn}`);
  return e;
}

export interface ExempelUnderlag {
  kap: KapitelModell;
  kpi: KpiModell;
  ctx: SpecKontext;
  visning: VisningId;
}

/** Modell, indikator och kontext för ett exempel, för den som vill anropa WP1 själv (t.ex. visningar). */
export function exempelUnderlag(namn: ExempelNamn, kontext: Partial<SpecKontext> = {}, visning?: VisningId): ExempelUnderlag {
  const e = exempel(namn);
  const kap = fixtur(e.data.fixtur);
  const kpi = kap.kpier.find((k) => k.id === e.data.kpi);
  if (!kpi) throw new Error(`Indikatorn ${e.data.kpi} saknas i ${FIXTURER[e.data.fixtur].namn}`);
  const ctx: SpecKontext = { vy: FIXTURER[e.data.fixtur].vy, fristaende: true, ...e.kontext, ...kontext };
  return { kap, kpi, ctx, visning: visning ?? e.visning };
}

/**
 * ChartSpec för ett galleriexempel, byggd av WP1:s kpiTillSpec (minidiagram:
 * minidiagramSpec). `kontext` ersätter exemplets utgångsläge och `visning`
 * exemplets visning.
 */
export function exempelSpec(namn: ExempelNamn, kontext: Partial<SpecKontext> = {}, visning?: VisningId): ChartSpec {
  const u = exempelUnderlag(namn, kontext, visning);
  return exempel(namn).typ === "minidiagram"
    ? minidiagramSpec(u.kpi, u.kap, u.ctx)
    : kpiTillSpec(u.kpi, u.kap, u.ctx, u.visning);
}

/** Figurens flikar för ett exempel (WP1:s visningar). */
export function exempelVisningar(namn: ExempelNamn, kontext: Partial<SpecKontext> = {}): { id: VisningId; etikett: string }[] {
  const u = exempelUnderlag(namn, kontext);
  return visningar(u.kpi, u.kap, u.ctx);
}

/** Brödsmulan från regionen ned till fokus (stilguiden 6.7); tom när fokus är regionen. */
export function exempelBrodsmula(namn: ExempelNamn, kontext: Partial<SpecKontext> = {}): { id: string; namn: string }[] {
  const u = exempelUnderlag(namn, kontext);
  const fokus = u.ctx.fokus ?? u.kpi.fokus;
  if (fokus === u.kpi.fokus) return [];
  const per = new Map(u.kap.enheter.map((e) => [e.id, e]));
  const kedja: Enhet[] = [];
  for (let e = per.get(fokus); e && kedja.length < 10; e = e.parent_id ? per.get(e.parent_id) : undefined) kedja.unshift(e);
  return kedja.map((e) => ({ id: e.id, namn: e.namn }));
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
}

/** Den senaste perioden med värde i fokusserien. */
const sistaPeriod = (kpi: KpiModell) =>
  [...(kpi.serier[kpi.fokus]?.tidsserie ?? [])].reverse().find((p) => p.varde !== null)?.period;

/** Översiktstabellens rader per avsnitt, för rapportkapitlet. */
export function oversiktExempel(): { kapitel: string; kalla: string; avsnitt: { namn: string; rader: OversiktRad[] }[] } {
  const { kap, vy, kalla } = exempelKapitel();
  const kapitletsPeriod = kap.kpier.map(sistaPeriod).filter(Boolean).sort().pop();
  const grupper = kap.avsnitt.length ? kap.avsnitt : [{ id: kap.id, namn: kap.namn, kpi_ids: kap.kpier.map((k) => k.id) }];
  return {
    kapitel: kap.namn,
    kalla,
    avsnitt: grupper.map((a) => ({
      namn: a.namn,
      rader: a.kpi_ids.flatMap((id): OversiktRad[] => {
        const kpi = kap.kpier.find((k) => k.id === id);
        if (!kpi) return [];
        const serie = kpi.serier[kpi.fokus];
        const sist = sistaPeriod(kpi);
        return [{
          kpiId: id, namn: kpi.namn,
          senaste: vardeText(serie?.senaste ?? null, kpi.format),
          period: sist && sist !== kapitletsPeriod ? periodText(sist, vy, "kort") : undefined,
          plats: serie?.rank && serie.rank_av ? `${serie.rank} av${HART}${serie.rank_av}` : undefined,
          status: kpi.status,
          spec: minidiagramSpec(kpi, kap, { vy }),
        }];
      }),
    })),
  };
}

// ════════════════════════════════════════════════════════════
//  Riktigt innehåll till typografiproverna
// ════════════════════════════════════════════════════════════

/** Tar bort em dash ur text från datan (stilguiden 3.1): skrivs om till komma. */
const EM_DASH = new RegExp(`\\s*${String.fromCharCode(0x2014)}\\s*`, "g");
export const utanEmDash = (s: string) => s.replace(EM_DASH, ", ");

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

/** Innehåll ur rapportkapitlet för typografiproverna. */
export function exempelInnehall(): Innehall {
  const { kap, vy } = exempelKapitel();
  const kpi = kap.kpier.find((k) => k.id === "kolada-n79179") ?? kap.kpier[0];
  const delIndex = Math.max(0, kap.avsnitt.findIndex((a) => a.kpi_ids.includes(kpi.id)));
  const del = kap.avsnitt[delIndex];
  const kpiIndex = Math.max(0, del?.kpi_ids.indexOf(kpi.id) ?? kap.kpier.indexOf(kpi));
  const serie = kpi.serier[kpi.fokus];
  const sist = sistaPeriod(kpi);
  const inledning = kap.om_statistiken[1] ?? kap.om_statistiken[0] ?? kap.dek ?? "";
  return {
    kapitel: kap.namn,
    avsnitt: { nr: String(delIndex + 1), namn: del?.namn ?? kap.namn },
    indikator: { nr: `${delIndex + 1}.${kpiIndex + 1}`, namn: kpi.namn },
    ingress: utanEmDash(meningar(inledning, 1)),
    brod: utanEmDash(meningar(kpi.analystext || kpi.fakta?.teori || "", 3)),
    figurtitel: exempelSpec("spaghetti-luckor").titel,
    nyckeltal: {
      varde: vardeText(serie?.senaste ?? null, kpi.format),
      plats: serie?.rank && serie.rank_av ? plats(serie.rank, serie.rank_av) : undefined,
      period: sist ? periodText(sist, vy, "kort") : DASH,
    },
    kalla: kpi.kalla ? `Källa: ${kpi.kalla.namn}, ${kpi.kalla.huvudman}` : "",
    kicker: "Region Halland · Analys",
  };
}
