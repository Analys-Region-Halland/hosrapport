// charts/karna/provspec.ts: TESTHJÄLP. Bygger en ChartSpec för linjediagrammet
// direkt ur dagens JSON (kontrakt v1, app/public/data) så att WP2 kan testa
// och granska utan WP1:s normalisera + kpiTillSpec. Används av tester,
// verktyg/grafprov och verktyg/sektioner/linje.stilguide. Inte produktkod:
// när WP1 är sammanslagen används kpiTillSpec (grafprov provar den först).
// Ägare: WP2.

import type { Not, Punkt, TalFormat, VyId } from "../../data/modell";
import { periodIntervall, plats, STANDARD_DECIMALER, varde } from "../../design/format";
import type { ChartSpec, SpecSerie } from "../spec";
import { periodRutnat } from "./skalor";

interface RaPunkt {
  period: string; etikett: string; varde: number | null;
  yhat?: number; yhat_lower_80?: number; yhat_upper_80?: number; yhat_lower?: number; yhat_upper?: number;
  signal?: "gron" | "gul" | "rod";
}
interface RaKpi {
  id: string; namn: string; enhet: string; inverterad?: boolean; utan_mal?: boolean;
  beskrivning?: string; senaste?: number | null; rank?: number; rank_av?: number;
  tidsserie: RaPunkt[];
  riket_serie?: RaPunkt[];
  kontext_serier?: { id: string; namn: string; tidsserie: RaPunkt[] }[];
  kalla?: { namn: string; url?: string; huvudman?: string };
  fakta?: { matt?: string };
}
interface RaSektion { id: string; namn: string; kpier: RaKpi[] }

/** Specen med WP1:s tillägg för plats (finns i spec.ts när WP1 är sammanslagen). */
export type ProvSpec = ChartSpec & { platsAv?: number[]; riktning?: "hog" | "lag" | "neutral"; serier: (SpecSerie & { platser?: (number | null)[] })[] };

export const FOKUS = "0013";
export const RIKET = "0000";

function talformat(k: RaKpi): TalFormat {
  const b = (k.beskrivning ?? "").toLowerCase();
  if (/(?<!\p{L})kr(?!\p{L})|kronor/u.test(b)) return { enhet: "kronor", decimaler: STANDARD_DECIMALER.kronor, etikett: "kr" };
  switch (k.enhet) {
    case "procent": return { enhet: "procent", decimaler: 1, etikett: "%" };
    case "minuter": return { enhet: "minuter", decimaler: 0, etikett: "min" };
    case "kvot": return { enhet: "kvot", decimaler: 1, etikett: "" };
    default: {
      // Antal med decimaler i datan (t.ex. per 1 000 invånare) behåller en decimal
      const harDecimaler = k.tidsserie.some((p) => p.varde !== null && !Number.isInteger(p.varde));
      return { enhet: "antal", decimaler: harDecimaler ? 1 : 0, etikett: "" };
    }
  }
}

function tillPunkt(p: RaPunkt): Punkt {
  const ut: Punkt = { period: p.period, etikett: p.etikett, varde: p.varde ?? null };
  if (p.yhat !== undefined) ut.yhat = p.yhat;
  if (p.yhat_lower_80 !== undefined) ut.lo80 = p.yhat_lower_80;
  if (p.yhat_upper_80 !== undefined) ut.hi80 = p.yhat_upper_80;
  if (p.yhat_lower !== undefined) ut.lo95 = p.yhat_lower;
  if (p.yhat_upper !== undefined) ut.hi95 = p.yhat_upper;
  if (p.signal) ut.signal = p.signal;
  return ut;
}

/** Punkter på periodrutnätet; saknade perioder blir varde: null. */
function fyll(punkter: RaPunkt[], rutnat: string[]): Punkt[] {
  const per = new Map(punkter.map((p) => [p.period.slice(0, 10), p]));
  return rutnat.map((iso) => {
    const p = per.get(iso);
    return p ? tillPunkt(p) : { period: iso, etikett: iso, varde: null };
  });
}

/** Plats per period bland regionerna (lika värden samma plats). */
function rangordna(serier: SpecSerie[], n: number, lagBast: boolean): { platser: Map<string, (number | null)[]>; av: number[] } {
  const platser = new Map(serier.map((s) => [s.id, Array<number | null>(n).fill(null)]));
  const av: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = serier.map((s) => ({ id: s.id, v: s.punkter?.[i]?.varde ?? null })).filter((x): x is { id: string; v: number } => x.v !== null);
    av.push(v.length);
    for (const x of v) {
      const battre = v.filter((y) => (lagBast ? y.v < x.v : y.v > x.v)).length;
      platser.get(x.id)![i] = battre + 1;
    }
  }
  return { platser, av };
}

/** Linjediagrammets spec för en indikator i en sektionsfil. */
export function provSpec(raSektion: unknown, kpiId: string | null, vy: VyId): ProvSpec {
  const sek = raSektion as RaSektion;
  const k = (kpiId ? sek.kpier.find((x) => x.id === kpiId) : undefined) ?? sek.kpier[0];
  const format = talformat(k);
  const regioner = k.kontext_serier ?? [];
  const alla = [...k.tidsserie, ...(k.riket_serie ?? []), ...regioner.flatMap((r) => r.tidsserie)].map((p) => p.period);
  const { perioder } = periodRutnat(alla);
  const n = perioder.length;
  const riktning: "hog" | "lag" | "neutral" = k.utan_mal ? "neutral" : k.inverterad ? "lag" : "hog";

  const serier: (SpecSerie & { platser?: (number | null)[] })[] = [
    { id: FOKUS, namn: "Halland", roll: "fokus", enhetId: FOKUS, punkter: fyll(k.tidsserie, perioder) },
  ];
  if (k.riket_serie?.length) {
    serier.push({ id: RIKET, namn: "Riket", roll: "referens", enhetId: RIKET, punkter: fyll(k.riket_serie, perioder) });
  }
  for (const r of regioner) {
    serier.push({ id: r.id, namn: r.namn, roll: "kontext", enhetId: r.id, punkter: fyll(r.tidsserie, perioder), interaktiv: true });
  }
  const harBand = k.tidsserie.some((p) => p.yhat_lower_80 !== undefined);
  if (harBand) {
    serier.push({
      id: "forvantat", namn: "Förväntat intervall", roll: "forvantat",
      intervall: k.tidsserie
        .filter((p) => p.yhat_lower_80 !== undefined && p.yhat_upper_80 !== undefined)
        .map((p) => ({ x: p.period, lo: p.yhat_lower_80!, hi: p.yhat_upper_80!, lo2: p.yhat_lower, hi2: p.yhat_upper })),
    });
  }

  // Plats per punkt (WP1:s fält `platser` och `platsAv`)
  let platsAv: number[] | undefined;
  if (regioner.length && riktning !== "neutral") {
    const rankade = serier.filter((s) => s.roll === "fokus" || s.roll === "kontext");
    const { platser, av } = rangordna(rankade, n, riktning === "lag");
    for (const s of rankade) s.platser = platser.get(s.id);
    platsAv = av;
  }

  // Etiketter vid linjeslut: Halland, riket, högsta och lägsta region
  const etiketter: ChartSpec["etiketter"] = [{ serieId: FOKUS, text: "Halland" }];
  if (k.riket_serie?.length) etiketter.push({ serieId: RIKET, text: "Riket" });
  if (harBand) etiketter.push({ serieId: "forvantat", text: "Förväntat intervall" });
  const sista = n - 1;
  const medVarde = serier
    .filter((s) => s.roll === "kontext" && s.punkter?.[sista]?.varde != null)
    .sort((a, b) => (b.punkter![sista].varde as number) - (a.punkter![sista].varde as number));
  if (medVarde.length) etiketter.push({ serieId: medVarde[0].id, text: medVarde[0].namn });
  if (medVarde.length > 1) etiketter.push({ serieId: medVarde[medVarde.length - 1].id, text: medVarde[medVarde.length - 1].namn });

  // Seriebrott ur beskrivningen ("Från och med 2024 ...")
  const noter: Not[] = [];
  const brott = /Från och med (\d{4})/.exec(k.beskrivning ?? "");
  if (brott) {
    noter.push({ typ: "seriebrott", period: `${brott[1]}-01-01`, text: `Från ${brott[1]} mäts värdet på ett nytt sätt; jämför över brottet med försiktighet.` });
  }
  const luckor = perioder.filter((_, i) => serier[0].punkter![i].varde === null);
  if (luckor.length) noter.push({ typ: "lucka", text: `Värden saknas för Halland ${luckor.map((p) => p.slice(0, 4)).join(" och ")}.` });

  const spann = n ? periodIntervall(perioder[0], perioder[sista], vy) : "";
  const matt = (k.fakta?.matt ?? k.namn).split(/(?<=\.)\s/)[0].replace(/\.$/, "");
  const titel = regioner.length ? "Halland jämfört med övriga regioner" : harBand ? "Mot förväntat intervall" : "Över tid";
  const enhetOrd = format.enhet === "procent" ? "procent" : format.enhet === "kronor" ? "kronor" : format.enhet === "minuter" ? "minuter" : "antal";
  const undertitel = regioner.length
    ? `${matt}, ${enhetOrd}. ${regioner.length + 1} regioner och riket, ${spann}.`
    : `${matt}, ${enhetOrd}. Region Halland, ${spann}.`;
  const senaste = serier[0].punkter!.filter((p) => p.varde !== null).at(-1);
  const platsText = k.rank && k.rank_av ? `, ${plats(k.rank, k.rank_av)}` : "";
  const sammanfattning = `Linjediagram som visar ${k.namn.toLowerCase()} för Halland ${spann}. Senaste värde ${varde(senaste?.varde ?? null, format, "lopande")}${platsText}.`;

  return {
    id: `${k.id}-tid`,
    typ: "linje",
    titel,
    undertitel,
    etiketter,
    jamforbara: regioner.map((r) => ({ enhetId: r.id, namn: r.namn, senaste: r.tidsserie.filter((p) => p.varde !== null).at(-1)?.varde ?? null })),
    serier,
    x: { typ: "tid", noll: false, format },
    y: { typ: "linjar", noll: false, format },
    noter,
    kalla: k.kalla ? { namn: k.kalla.namn, url: k.kalla.url } : undefined,
    sammanfattning,
    tabell: {
      caption: titel,
      kolumner: ["Region", ...perioder.map((p) => p.slice(0, 4))],
      rader: serier.filter((s) => s.punkter).map((s) => [s.namn, ...s.punkter!.map((p) => p.varde)]),
      fokusRad: 0,
    },
    hojdklass: "standard",
    platsAv,
    riktning,
  };
}

/** Alla indikatorer i en sektionsfil (för SSR-tester och grafprov). */
export function kpiIdn(raSektion: unknown): string[] {
  return (raSektion as RaSektion).kpier.map((k) => k.id);
}
