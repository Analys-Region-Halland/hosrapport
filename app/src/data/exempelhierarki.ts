// data/exempelhierarki.ts: PÅHITTAD nivå under sjukhusen i akutflödet (WP10).
// Ägare: WP10. Anropas av normalisera bara för kapitlet akutflöde och tas bort
// när riktig data per avdelning kommer (då levererar R enheterna och värdena).
//
// Vad modulen gör med ett normaliserat akutflödeskapitel:
//   - lägger 2–4 avdelningar under varje sjukhus (stationer under ambulans-
//     områdena Nord och Syd, som samtidigt får rätt nivå i stället för "sjukhus");
//   - räknar fram en serie per avdelning ur sjukhusets serie, deterministiskt
//     (fast frö per indikator, avdelning och period): summamått delas upp så att
//     delarna summerar exakt till sjukhuset, medel- och andelsmått får värden
//     vars medelvärde vägt med antal fall `n` är sjukhusets värde (inom
//     avrundningen);
//   - undertrycker värden baserade på färre än UNDERTRYCK_UNDER fall (värdet
//     skickas inte, punkten får `undertryckt: true`) och lägger noten om det.
// Namnen ser ut som avdelningar men påstår inte att de finns; kapitlets notis
// om exempeldata (data/kapitelinfo.ts) gäller dem.

import type { Enhet, KapitelModell, KpiModell, Niva, Not, Punkt, VyId } from "./modell";

/** Värden baserade på färre fall än så här visas inte (stilguiden 6.7). */
export const UNDERTRYCK_UNDER = 10;

/** Noten som följer undertryckta värden. */
export const UNDERTRYCKT_NOT = `Värden baserade på färre än ${UNDERTRYCK_UNDER} fall visas inte.`;

interface Barnmall {
  /** Barnens nivå. */
  niva: Niva;
  /** Ny nivå för föräldern, när normalisera gissat fel (ambulansområden är inga sjukhus). */
  foralderNiva?: Niva;
  /** Förälderns storlek i förhållande till Halmstad, för antal fall i medel- och andelsmått. */
  storlek: number;
  /** Namn och ungefärlig andel av förälderns volym; andelarna summerar till 1. */
  barn: [string, number][];
}

/** De påhittade enheterna under varje underliggande enhet i akutflödet, efter förälderns id. */
export const BARNMALLAR: Record<string, Barnmall> = {
  halmstad: { niva: "avdelning", storlek: 1, barn: [
    ["Akutvårdsavdelning", 0.4], ["Medicin 3", 0.32], ["Kirurgi 2", 0.26], ["Infektion", 0.02],
  ] },
  varberg: { niva: "avdelning", storlek: 0.65, barn: [
    ["Akutvårdsavdelning", 0.42], ["Medicin 1", 0.34], ["Ortopedi", 0.24],
  ] },
  kungsbacka: { niva: "avdelning", storlek: 0.5, barn: [
    ["Medicin", 0.62], ["Geriatrik", 0.38],
  ] },
  nord: { niva: "ambulansstation", foralderNiva: "ambulansomrade", storlek: 0.55, barn: [
    ["Station Kungsbacka", 0.38], ["Station Varberg", 0.36], ["Station Falkenberg", 0.26],
  ] },
  syd: { niva: "ambulansstation", foralderNiva: "ambulansomrade", storlek: 0.45, barn: [
    ["Station Halmstad", 0.7], ["Station Laholm", 0.3],
  ] },
};

/**
 * Antal fall per dag i Halmstad för medel- och andelsmått: vårdplatser för
 * beläggningen, patienter som läggs in via akuten för väntetiden. Summamått
 * räknar själva sina fall (n = värdet).
 */
const FALL_PER_DAG: Record<string, number> = { belaggning: 150, vantetid: 20 };
const FALL_PER_DAG_ANNARS = 50;

/** Hur mycket avdelningarna sprider sig kring sjukhuset i medel- och andelsmått (andel av värdet). */
const SPRIDNING: Record<string, number> = { belaggning: 0.04, vantetid: 0.12 };
const SPRIDNING_ANNARS = 0.06;

// ── Slump med fast frö ──

/** Frö ur en text (FNV-1a). */
function fro(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/** Deterministisk slumpgenerator (mulberry32): samma frö ger samma följd. */
function slump(text: string): () => number {
  let a = fro(text);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Hjälp ──

/** Id för ett barn: förälderns id och namnet som slug ("halmstad-medicin-3"). */
export function barnId(foralder: string, namn: string): string {
  const s = namn.toLowerCase()
    .replace(/[åä]/g, "a").replace(/ö/g, "o").replace(/é/g, "e")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${foralder}-${s}`;
}

/** Dagar i perioden som börjar `iso`. */
function dagar(iso: string, vy: VyId): number {
  const [a, m] = iso.split("-").map(Number);
  switch (vy) {
    case "dag": return 1;
    case "vecka": return 7;
    case "manad": return new Date(Date.UTC(a, m, 0)).getUTCDate();
    case "kvartal": return [0, 1, 2].reduce((s, k) => s + new Date(Date.UTC(a, m + k, 0)).getUTCDate(), 0);
    case "ar": return (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0 ? 366 : 365;
  }
}

const avrunda = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** Andelarna en viss period: mallens andelar med lite brus, summerar till 1. */
function periodAndelar(mall: Barnmall, r: () => number): number[] {
  const brutto = mall.barn.map(([, a]) => a * (1 + (r() - 0.5) * 0.3));
  const summa = brutto.reduce((s, v) => s + v, 0);
  return brutto.map((v) => v / summa);
}

/** Delar ett heltal (i enheter om 10^-d) i delar efter andelar; delarna summerar exakt (största resten). */
function delaHeltal(total: number, andelar: number[], d: number): number[] {
  const skala = 10 ** d;
  const heltal = Math.round(total * skala);
  const rakt = andelar.map((a) => heltal * a);
  const golv = rakt.map(Math.floor);
  let kvar = heltal - golv.reduce((s, v) => s + v, 0);
  const ordning = rakt.map((v, i) => ({ i, rest: v - Math.floor(v) })).sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of ordning) {
    if (kvar <= 0) break;
    golv[i]++;
    kvar--;
  }
  return golv.map((v) => v / skala);
}

// ── En period ──

/** Ett barns värde och antal fall en period, före undertryckning. */
export interface RaDel {
  id: string;
  varde: number | null;
  n: number;
}

/**
 * Barnens värden en period, före undertryckning. Summamått: delarna summerar
 * till förälderns värde och n är värdet. Medel- och andelsmått: medelvärdet
 * av delarna vägt med n är förälderns värde (inom avrundningen till
 * indikatorns decimaler).
 */
export function delaUpp(
  kpi: Pick<KpiModell, "id" | "aggregering" | "format">,
  foralderId: string,
  punkt: Pick<Punkt, "period" | "varde">,
  vy: VyId,
): RaDel[] {
  const mall = BARNMALLAR[foralderId];
  if (!mall) return [];
  const ids = mall.barn.map(([namn]) => barnId(foralderId, namn));
  const V = punkt.varde;
  if (V === null) return ids.map((id) => ({ id, varde: null, n: 0 }));
  const r = slump(`${kpi.id}|${foralderId}|${punkt.period}`);
  const andelar = periodAndelar(mall, r);
  const d = kpi.format.decimaler;

  if (kpi.aggregering === "summa") {
    const delar = delaHeltal(V, andelar, d);
    return ids.map((id, i) => ({ id, varde: delar[i], n: Math.round(delar[i]) }));
  }

  // Medel och andel: antal fall per barn, värden kring föräldern, sedan en
  // förskjutning så att det vägda medelvärdet blir förälderns värde.
  const fall = (FALL_PER_DAG[kpi.id] ?? FALL_PER_DAG_ANNARS) * mall.storlek * dagar(punkt.period, vy);
  const n = andelar.map((a) => Math.max(1, Math.round(fall * a)));
  const spridning = SPRIDNING[kpi.id] ?? SPRIDNING_ANNARS;
  const ra = ids.map((id) => {
    const lage = slump(`${kpi.id}|${id}`)() * 2 - 1;            // avdelningens fasta läge, −1 till 1
    return V * (1 + spridning * (lage + (r() - 0.5) * 0.6));
  });
  const N = n.reduce((s, v) => s + v, 0);
  const skillnad = V - ra.reduce((s, v, i) => s + v * n[i], 0) / N;
  return ids.map((id, i) => ({ id, varde: Math.max(0, avrunda(ra[i] + skillnad, d)), n: n[i] }));
}

// ── Kapitlet ──

/** Barnens serier för en indikator: en per barn, på förälderns periodrutnät, undertryckta under tröskeln. */
function barnSerier(kpi: KpiModell, foralderId: string, vy: VyId): Map<string, Punkt[]> {
  const ut = new Map<string, Punkt[]>();
  const foralder = kpi.serier[foralderId];
  if (!foralder) return ut;
  for (const p of foralder.tidsserie) {
    for (const del of delaUpp(kpi, foralderId, p, vy)) {
      const q: Punkt = { period: p.period, etikett: p.etikett, varde: del.varde };
      if (del.varde !== null) {
        if (del.n < UNDERTRYCK_UNDER) {
          q.varde = null;
          q.undertryckt = true;
        } else q.n = del.n;
      }
      const lista = ut.get(del.id) ?? [];
      lista.push(q);
      ut.set(del.id, lista);
    }
  }
  return ut;
}

/**
 * Kapitlet med den påhittade nivån under sjukhusen och ambulansområdena.
 * Ren funktion: ändrar inte `kap`. Samma kapitel och vy ger alltid samma svar.
 */
export function medExempelhierarki(kap: KapitelModell, vy: VyId): KapitelModell {
  const enheter: Enhet[] = [];
  for (const e of kap.enheter) {
    const mall = BARNMALLAR[e.id];
    enheter.push(mall?.foralderNiva ? { ...e, niva: mall.foralderNiva } : e);
    if (!mall) continue;
    for (const [namn] of mall.barn) enheter.push({ id: barnId(e.id, namn), namn, niva: mall.niva, parent_id: e.id });
  }

  const kpier = kap.kpier.map((kpi): KpiModell => {
    const serier = { ...kpi.serier };
    let undertryckt = false;
    for (const foralderId of Object.keys(kpi.serier)) {
      if (!BARNMALLAR[foralderId]) continue;
      for (const [id, tidsserie] of barnSerier(kpi, foralderId, vy)) {
        const med = tidsserie.filter((p) => p.varde !== null);
        serier[id] = { enhet_id: id, senaste: med.length ? med[med.length - 1].varde : null, tidsserie };
        undertryckt ||= tidsserie.some((p) => p.undertryckt);
      }
    }
    const noter: Not[] = undertryckt && !kpi.noter.some((n) => n.typ === "undertryckt")
      ? [...kpi.noter, { typ: "undertryckt", text: UNDERTRYCKT_NOT }]
      : kpi.noter;
    return { ...kpi, serier, noter };
  });

  return { ...kap, enheter, kpier };
}
