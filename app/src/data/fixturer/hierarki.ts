// data/fixturer/hierarki.ts: påhittad hierarki region › sjukhus › avdelning
// för nedborrning (WP10), tester och galleriet. Ägare: WP1.
//
// ALL DATA HÄR ÄR PÅHITTAD. Värdena räknas fram deterministiskt (fast frö),
// så samma anrop ger alltid samma modell. Sjukhusen och regionen är aggregat av
// avdelningarna: andelar vägs med antal fall, antal summeras.
//
// Tre indikatorer, en per fall som nedborrningen behöver:
//   belaggning       andel med förväntat intervall (linje mot förväntat)
//   utskrivningar    summamått utan riktning (stapel, beskrivande mått)
//   aterinskrivning  andel med få fall; värden under tio fall är undertryckta

import { period as periodText } from "../../design/format";
import { HALLAND_ID } from "../modell";
import type { Enhet, EnhetSerie, KapitelModell, KpiModell, Punkt, Status } from "../modell";
import { huvudpunkter, nastaPeriod } from "../normalisera";

/** Tröskel för undertryckning (antal fall). */
export const MIN_N = 10;

const FORSTA = "2024-04-01";
const ANTAL_MANADER = 24;

const SJUKHUS: { id: string; namn: string; kortnamn: string; avdelningar: [string, string][] }[] = [
  { id: "halmstad", namn: "Hallands sjukhus Halmstad", kortnamn: "Halmstad", avdelningar: [
    ["halmstad-medicin-1", "Medicinavdelning 1"], ["halmstad-medicin-2", "Medicinavdelning 2"],
    ["halmstad-kirurgi", "Kirurgavdelning"], ["halmstad-ortopedi", "Ortopedavdelning"],
  ] },
  { id: "varberg", namn: "Hallands sjukhus Varberg", kortnamn: "Varberg", avdelningar: [
    ["varberg-medicin", "Medicinavdelning"], ["varberg-kirurgi", "Kirurgavdelning"], ["varberg-ortopedi", "Ortopedavdelning"],
  ] },
  { id: "kungsbacka", namn: "Hallands sjukhus Kungsbacka", kortnamn: "Kungsbacka", avdelningar: [
    ["kungsbacka-geriatrik", "Geriatrisk avdelning"], ["kungsbacka-rehab", "Rehabiliteringsavdelning"],
  ] },
];

/** Enkel deterministisk slumpgenerator (mulberry32). */
function slump(fro: number): () => number {
  let a = fro >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const avrunda = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

interface RaAvdelning {
  belagda: number[];     // belagda vårdplatsdygn
  platser: number[];     // disponibla vårdplatsdygn
  utskrivna: number[];   // antal utskrivningar
  ater: number[];        // återinskrivna inom 30 dagar
  fall: number[];        // utskrivna 65 år och äldre (nämnare för återinskrivning)
}

function avdelningsData(id: string, perioder: string[]): RaAvdelning {
  let fro = 7;
  for (const c of id) fro = (Math.imul(fro, 31) + c.charCodeAt(0)) >>> 0;
  const r = slump(fro);
  const liten = id.startsWith("kungsbacka");
  const platserPerDag = liten ? 12 + Math.floor(r() * 6) : 22 + Math.floor(r() * 10);
  const grund = 0.86 + r() * 0.1;
  const utskrivGrund = liten ? 28 + r() * 10 : 90 + r() * 60;
  const aterGrund = 0.09 + r() * 0.06;
  const ut: RaAvdelning = { belagda: [], platser: [], utskrivna: [], ater: [], fall: [] };
  perioder.forEach((p, i) => {
    const manad = Number(p.slice(5, 7));
    const sasong = Math.cos(((manad - 1) / 12) * 2 * Math.PI) * 0.03; // högre vintertid
    const dagar = new Date(Date.UTC(Number(p.slice(0, 4)), manad, 0)).getUTCDate();
    const platser = platserPerDag * dagar;
    // En tydlig topp i december 2025 för Halmstad, så att avvikelsemarkörer syns.
    const topp = id.startsWith("halmstad") && p === "2025-12-01" ? 0.06 : 0;
    const andel = Math.min(1.08, grund + sasong + topp + (r() - 0.5) * 0.03);
    const utskrivna = Math.round(utskrivGrund * (1 + sasong * 2 + (r() - 0.5) * 0.1));
    const fall = Math.round(utskrivna * (liten ? 0.3 : 0.45) * (0.8 + r() * 0.4));
    ut.platser.push(platser);
    ut.belagda.push(Math.round(platser * andel));
    ut.utskrivna.push(utskrivna);
    ut.fall.push(fall);
    ut.ater.push(Math.round(fall * Math.max(0, aterGrund + (r() - 0.5) * 0.04 + (i > 18 ? 0.01 : 0))));
  });
  return ut;
}

const summa = (lista: RaAvdelning[]): RaAvdelning => ({
  belagda: lista[0].belagda.map((_, i) => lista.reduce((s, a) => s + a.belagda[i], 0)),
  platser: lista[0].platser.map((_, i) => lista.reduce((s, a) => s + a.platser[i], 0)),
  utskrivna: lista[0].utskrivna.map((_, i) => lista.reduce((s, a) => s + a.utskrivna[i], 0)),
  ater: lista[0].ater.map((_, i) => lista.reduce((s, a) => s + a.ater[i], 0)),
  fall: lista[0].fall.map((_, i) => lista.reduce((s, a) => s + a.fall[i], 0)),
});

const punkt = (iso: string, varde: number | null): Punkt => ({ period: iso, etikett: periodText(iso, "manad", "axel"), varde });

/** Beläggning i procent med förväntat intervall ur ett glidande medelvärde. */
function belaggningSerie(id: string, d: RaAvdelning, perioder: string[]): EnhetSerie {
  const varden = d.belagda.map((b, i) => (100 * b) / d.platser[i]);
  const tidsserie = perioder.map((iso, i) => {
    const tidigare = varden.slice(Math.max(0, i - 12), i);
    const yhat = tidigare.length ? tidigare.reduce((s, v) => s + v, 0) / tidigare.length : varden[i];
    const sigma = 1.6;
    const v = varden[i];
    const p = punkt(iso, avrunda(v, 1));
    p.yhat = avrunda(yhat, 1);
    p.lo80 = avrunda(yhat - 1.28 * sigma, 1); p.hi80 = avrunda(yhat + 1.28 * sigma, 1);
    p.lo95 = avrunda(yhat - 1.96 * sigma, 1); p.hi95 = avrunda(yhat + 1.96 * sigma, 1);
    const avvik = Math.abs(v - yhat);
    p.signal = avvik <= 1.28 * sigma ? "gron" : avvik <= 1.96 * sigma ? "gul" : "rod";
    return p;
  });
  return medSenaste(id, tidsserie, tidsserie[tidsserie.length - 1].signal);
}

function utskrivningarSerie(id: string, d: RaAvdelning, perioder: string[]): EnhetSerie {
  return medSenaste(id, perioder.map((iso, i) => punkt(iso, d.utskrivna[i])));
}

/** Återinskrivning i procent; under MIN_N fall skickas inget värde (undertryckt). */
function aterinskrivningSerie(id: string, d: RaAvdelning, perioder: string[]): EnhetSerie {
  const tidsserie = perioder.map((iso, i) => {
    if (d.fall[i] < MIN_N) return { ...punkt(iso, null), undertryckt: true };
    const p = punkt(iso, avrunda((100 * d.ater[i]) / d.fall[i], 1));
    p.n = d.fall[i];
    return p;
  });
  const sista = [...tidsserie].reverse().find((p) => p.varde !== null)?.varde ?? null;
  const status: Status | undefined = sista === null ? undefined : sista <= 12 ? "gron" : sista <= 14 ? "gul" : "rod";
  return medSenaste(id, tidsserie, status);
}

function medSenaste(id: string, tidsserie: Punkt[], status?: Status): EnhetSerie {
  const med = tidsserie.filter((p) => p.varde !== null);
  const s: EnhetSerie = { enhet_id: id, senaste: med.length ? med[med.length - 1].varde : null, tidsserie };
  if (med.length >= 2) s.forandring = avrunda((med[med.length - 1].varde as number) - (med[med.length - 2].varde as number), 1);
  if (status) s.status = status;
  return s;
}

/** Den påhittade hierarkin som ett färdigt kapitel (månadsdata, 24 månader). */
export function hierarkiKapitel(): KapitelModell {
  const perioder: string[] = [FORSTA];
  while (perioder.length < ANTAL_MANADER) perioder.push(nastaPeriod(perioder[perioder.length - 1], "manad"));

  const enheter: Enhet[] = [{ id: HALLAND_ID, namn: "Region Halland", kortnamn: "Halland", niva: "region", parent_id: null }];
  const data = new Map<string, RaAvdelning>();
  const sjukhusData: RaAvdelning[] = [];
  SJUKHUS.forEach((s, i) => {
    enheter.push({ id: s.id, namn: s.namn, kortnamn: s.kortnamn, niva: "sjukhus", parent_id: HALLAND_ID, ordning: i + 1 });
    const avd = s.avdelningar.map(([id, namn]) => {
      enheter.push({ id, namn, niva: "avdelning", parent_id: s.id });
      const d = avdelningsData(id, perioder);
      data.set(id, d);
      return d;
    });
    const agg = summa(avd);
    data.set(s.id, agg);
    sjukhusData.push(agg);
  });
  data.set(HALLAND_ID, summa(sjukhusData));

  const serier = (bygg: (id: string, d: RaAvdelning, p: string[]) => EnhetSerie) =>
    Object.fromEntries([...data].map(([id, d]) => [id, bygg(id, d, perioder)]));

  const belaggning = serier(belaggningSerie);
  const ater = serier(aterinskrivningSerie);
  const kpier: KpiModell[] = [
    {
      id: "demo-belaggning", namn: "Beläggningsgrad (påhittad)",
      format: { enhet: "procent", decimaler: 1, etikett: "%" }, aggregering: "andel", riktning: "lag",
      status: belaggning[HALLAND_ID].status ?? null, fokus: HALLAND_ID, serier: belaggning,
      analystext: "", noter: [{ typ: "fotnot", text: "Påhittade värden för utveckling och tester." }],
    },
    {
      id: "demo-utskrivningar", namn: "Utskrivningar från slutenvård (påhittad)",
      format: { enhet: "antal", decimaler: 0, etikett: "" }, aggregering: "summa", riktning: "neutral",
      status: null, fokus: HALLAND_ID, serier: serier(utskrivningarSerie),
      analystext: "", noter: [{ typ: "fotnot", text: "Påhittade värden för utveckling och tester." }],
    },
    {
      id: "demo-aterinskrivning", namn: "Återinskrivning inom 30 dagar, 65 år och äldre (påhittad)",
      format: { enhet: "procent", decimaler: 1, etikett: "%" }, aggregering: "andel", riktning: "lag",
      status: ater[HALLAND_ID].status ?? null, fokus: HALLAND_ID, serier: ater,
      analystext: "",
      noter: [{ typ: "undertryckt", text: `Värden baserade på färre än ${MIN_N} fall visas inte.` }],
    },
  ];

  return {
    id: "demo-hierarki",
    namn: "Slutenvård per sjukhus och avdelning (påhittad)",
    dek: "Påhittad hierarki för nedborrning från region till sjukhus och avdelning.",
    huvudpunkter: huvudpunkter(kpier, "manad"),
    enheter,
    avsnitt: [],
    kpier,
    om_statistiken: ["All data i det här kapitlet är påhittad och används bara för utveckling och tester."],
    kallor: [],
    leverans: [],
  };
}
