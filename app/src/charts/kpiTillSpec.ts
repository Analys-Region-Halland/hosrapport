// charts/kpiTillSpec.ts: ren funktion från KpiModell till ChartSpec
// (docs/arkitektur.md 4.2). Ägare: WP1. Ingen DOM.
//
// Vad som ritas per visning:
//   tid           linje mot regionerna, linje mot förväntat intervall, stapel
//                 (summamått, högst 24 perioder, inga regioner) eller enkel linje
//   rang          placeringen bland regionerna år för år (bumpdiagram, 2026-10-08) när
//                 fokus har plats för minst två perioder, annars regionerna
//                 rangordnade senaste perioden; topp 3-gräns utom för neutrala mått
//   enheter       små multiplar per underliggande enhet, delad skala
//   enheterRang   de underliggande enheterna rangordnade
// Inga legender och inga zoner: varje serie som ska ha namn står i `etiketter`.

import type { Enhet, KapitelModell, KpiModell, Niva, Not, Punkt, TalFormat } from "../data/modell";
import { platser, sistaMedVarde } from "../data/normalisera";
import { DASH, UNDERTRYCKT, antalILoptext, tal } from "../design/format";
import type { ChartSpec, SpecKontext, SpecSerie, VisningId } from "./spec";
import {
  antalMeningar, figurTitel, figurUndertitel, luckText, mattOchEnhet, mattPeriod, miniSammanfattning, periodKort, textsammanfattning, versal,
} from "./text";
import {
  NIVA_ORD, STATUS_ORD, barnNiva, enhet, giltigVisning, indexera, kortNamn, panelEnheter, punkter, rangordning,
  referensForEnheter, somIndex, tillgangliga, underlag,
} from "./underlag";
import type { Underlag } from "./underlag";

/** Högst fyra fästa serier (stilguiden 2.2); den senast fästa ersätter den äldsta. */
const MAX_FASTA = 4;

const INDEXFORMAT: TalFormat = { enhet: "kvot", decimaler: 0, etikett: "" };

// ── Visningar ──

/** Flikarna i figuren, förvald först (arkitektur 4.2, stilguiden 5.4 och 6.7). */
export function visningar(kpi: KpiModell, kap: KapitelModell, ctx: SpecKontext): { id: VisningId; etikett: string }[] {
  const u = underlag(kpi, kap, ctx);
  const finns = tillgangliga(u);
  const niva = NIVA_ORD[barnNiva(u)];
  const etikett: Record<VisningId, string> = {
    // Med regioner är fliken "Över tid"; med enheter är den nivåfliken "Region Halland" (6.7).
    tid: u.regioner.length || !finns.includes("enheter") ? "Över tid" : u.fokusNamnLang,
    rang: "Rangordning",
    enheter: `Per ${niva.en}`,
    enheterRang: `${versal(niva.bestamd)} rangordnade`,
  };
  return finns.map((id) => ({ id, etikett: etikett[id] }));
}

// ── Gemensamt ──

function kallaFor(kpi: KpiModell): ChartSpec["kalla"] {
  if (!kpi.kalla) return undefined;
  const via = kpi.id.startsWith("kolada-") ? ", via Kolada" : "";
  const huvudman = kpi.kalla.huvudman && kpi.kalla.huvudman !== kpi.kalla.namn ? `, ${kpi.kalla.huvudman}` : "";
  const k: NonNullable<ChartSpec["kalla"]> = { namn: `${kpi.kalla.namn}${huvudman}${via}` };
  if (kpi.kalla.url) k.url = kpi.kalla.url;
  return k;
}

/** Fästa enheter bland kandidaterna, i fästordning, högst fyra. */
function fastaBland(u: Underlag, kandidater: string[]): string[] {
  return (u.ctx.fasta ?? []).filter((id, i, alla) => id !== u.fokusId && kandidater.includes(id) && alla.indexOf(id) === i).slice(-MAX_FASTA);
}

/** Jämförbara serier för "+ Jämför med …", alfabetiskt. */
function jamforbaraFor(u: Underlag, ids: string[], index: number): ChartSpec["jamforbara"] {
  return ids
    .map((id) => ({ enhetId: id, namn: kortNamn(enhet(u.kap, id)), senaste: punkter(u, id)[index]?.varde ?? null }))
    .sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
}

/** De jämförbaras nivå för "+ Jämför med {etikett}": regioner, eller fokusenhetens syskon på samma nivå. */
const jamforNivaFor = (niva: Niva): NonNullable<ChartSpec["jamforNiva"]> => ({ id: niva, etikett: NIVA_ORD[niva].en });

/** Noter för tidsvisningar: seriebrott inom perioden, luckor och undertryckta värden. */
function tidsnoter(u: Underlag, visadeIds: string[]): Not[] {
  const ut: Not[] = [];
  const forsta = u.perioder[0], sista = u.perioder[u.perioder.length - 1];
  for (const n of u.kpi.noter) {
    if (n.typ === "seriebrott" && !u.dagar && n.period && n.period > forsta && n.period <= sista) ut.push(n);
    else if (n.typ !== "seriebrott" && n.typ !== "undertryckt") ut.push(n);
  }
  const lucka = luckText(u);
  if (lucka) ut.push({ typ: "lucka", text: lucka });
  ut.push(...undertrycktNot(u, visadeIds));
  return ut;
}

/** Not om undertryckta värden när någon visad serie har sådana (stilguiden 6.7). */
function undertrycktNot(u: Underlag, ids: string[]): Not[] {
  if (!ids.some((id) => punkter(u, id).some((p) => p.undertryckt))) return [];
  const egen = u.kpi.noter.find((n) => n.typ === "undertryckt");
  return [egen ?? { typ: "undertryckt", text: "Värden baserade på för få fall visas inte." }];
}

/** Tabellcell: tal som tal, undertryckt som "..", saknat som null. */
const cell = (p: Punkt | undefined): number | string | null => (p?.undertryckt ? UNDERTRYCKT : p?.varde ?? null);

const bas = (u: Underlag, visning: VisningId) => {
  const titel = figurTitel(u.kpi, u.kap, u.ctx, visning);
  const kalla = kallaFor(u.kpi);
  return {
    id: [u.kpi.id, visning, u.fokusId !== u.kpi.fokus ? u.fokusId : "", u.dagar ? "dagar" : ""].filter(Boolean).join(":"),
    ...(u.ctx.fristaende ? { kicker: u.kap.namn } : {}),
    titel,
    undertitel: figurUndertitel(u.kpi, u.kap, u.ctx, visning),
    sammanfattning: textsammanfattning(u.kpi, u.kap, u.ctx, visning),
    ...(kalla ? { kalla } : {}),
  };
};

const periodKolumner = (u: Underlag) => u.perioder.map((p) => periodKort(p, u.vy));

// ── Över tid ──

function linjeRegioner(u: Underlag): ChartSpec {
  const f = u.kpi.format;
  const fasta = fastaBland(u, u.regioner);
  const n = u.perioder.length;
  const rikt = u.kpi.riktning;
  const iSenaste = Math.max(0, sistaMedVarde(punkter(u, u.fokusId)));

  // Plats per period bland regionerna med värde; Hallands senaste plats ur datan.
  const regionIds = [u.fokusId, ...u.regioner];
  let platsPer: Map<string, (number | null)[]> | undefined;
  let platsAv: number[] | undefined;
  if (rikt !== "neutral") {
    const per = new Map(regionIds.map((id) => [id, Array<number | null>(n).fill(null)]));
    platsAv = u.perioder.map((_, i) => {
      const p = platser(new Map(regionIds.map((id) => [id, punkter(u, id)[i]?.varde ?? null])), rikt);
      for (const [id, plats] of p) (per.get(id) as (number | null)[])[i] = plats;
      return p.size;
    });
    const rank = u.kpi.serier[u.fokusId]?.rank;
    if (rank !== undefined) (per.get(u.fokusId) as (number | null)[])[iSenaste] = rank;
    platsPer = per;
  }

  const serie = (id: string, roll: SpecSerie["roll"], extra: Partial<SpecSerie> = {}): SpecSerie => {
    const s: SpecSerie = { id, namn: kortNamn(enhet(u.kap, id)), roll, enhetId: id, punkter: punkter(u, id), ...extra };
    const pl = platsPer?.get(id);
    if (pl) s.platser = pl;
    return s;
  };

  const kontext = u.regioner.filter((id) => !fasta.includes(id));
  const serier: SpecSerie[] = [
    ...kontext.map((id) => serie(id, "kontext", { interaktiv: true })),
    ...(u.referensId ? [serie(u.referensId, "referens", { interaktiv: false })] : []),
    ...fasta.map((id, i) => serie(id, "markerad", { markeringIndex: i, interaktiv: true })),
    serie(u.fokusId, "fokus", { interaktiv: false }),
  ];

  // Etiketter: Halland, riket, fästa samt högsta och lägsta övriga region sista perioden.
  const etiketter = [{ serieId: u.fokusId, text: u.fokusNamn }];
  if (u.referensId) etiketter.push({ serieId: u.referensId, text: kortNamn(enhet(u.kap, u.referensId)) });
  fasta.forEach((id) => etiketter.push({ serieId: id, text: kortNamn(enhet(u.kap, id)) }));
  const sista = n - 1;
  const medSista = kontext.map((id) => ({ id, v: punkter(u, id)[sista]?.varde ?? null })).filter((x): x is { id: string; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v);
  if (medSista.length) {
    for (const x of [medSista[0], medSista[medSista.length - 1]]) {
      if (!etiketter.some((e) => e.serieId === x.id)) etiketter.push({ serieId: x.id, text: kortNamn(enhet(u.kap, x.id)) });
    }
  }

  // Tabell: en rad per region, Halland och riket först.
  const tabellIds = [u.fokusId, ...(u.referensId ? [u.referensId] : []),
    ...[...u.regioner].sort((a, b) => kortNamn(enhet(u.kap, a)).localeCompare(kortNamn(enhet(u.kap, b)), "sv"))];
  const b = bas(u, "tid");
  return {
    ...b,
    typ: "linje",
    etiketter,
    jamforbara: jamforbaraFor(u, u.regioner, iSenaste),
    jamforNiva: jamforNivaFor("region"),
    serier,
    x: { typ: "tid", noll: false, format: f },
    y: { typ: "linjar", noll: false, format: f },
    noter: tidsnoter(u, [u.fokusId]),
    tabell: {
      caption: b.titel,
      kolumner: ["Region", ...periodKolumner(u)],
      rader: tabellIds.map((id) => [kortNamn(enhet(u.kap, id)), ...punkter(u, id).map(cell)]),
      fokusRad: 0,
    },
    hojdklass: "standard",
    ...(platsAv ? { platsAv } : {}),
  };
}

// ── Placering över tid (bumpdiagram) ──

/**
 * Regionernas plats år för år (charts/typer/bump.tsx). Byggs på linjens spec,
 * som redan har plats per period för varje region; riket har ingen plats och
 * utgår. null när fokus har plats för färre än två perioder.
 */
function bumpSpec(u: Underlag): ChartSpec | null {
  const linje = linjeRegioner(u);
  if (!linje.platsAv) return null;
  const fokus = linje.serier.find((s) => s.roll === "fokus");
  if ((fokus?.platser?.filter((p) => p !== null).length ?? 0) < 2) return null;

  const serier: SpecSerie[] = [
    ...linje.serier.filter((s) => s.roll !== "referens" && s.platser?.some((p) => p !== null)),
    { id: "topp3", namn: "Topp 3", roll: "grans", varde: 3 },
  ];
  const regioner = serier.filter((s) => s.roll !== "grans");
  const medPlats = u.perioder.map((_, i) => regioner.some((s) => s.platser?.[i] != null));
  const forsta = medPlats.indexOf(true), sista = medPlats.lastIndexOf(true);
  const intervall = forsta === sista
    ? periodKort(u.perioder[forsta], u.vy)
    : `${periodKort(u.perioder[forsta], u.vy)}${DASH}${periodKort(u.perioder[sista], u.vy)}`;
  const flest = Math.max(...linje.platsAv);
  const undertitel = `${mattOchEnhet(u.kpi, u.vy)}. Placering bland ${antalILoptext(flest)} regioner år för år, plats 1 är bäst, ${intervall}.`;

  // Tabell: en rad per region, ordnade efter sista platsen; cellerna är platser
  const sistaPlats = (s: SpecSerie) => [...(s.platser ?? [])].reverse().find((p) => p !== null) ?? Infinity;
  const ordnade = [...regioner].sort((a, b) => sistaPlats(a) - sistaPlats(b) || a.namn.localeCompare(b.namn, "sv"));
  // Textsammanfattningen (aria-label, 100–200 tecken) beskriver placeringen över tid
  const fp = (fokus?.platser ?? []).map((p, i) => ({ p, i })).filter((x): x is { p: number; i: number } => x.p !== null);
  const fa = fp[0], fb = fp[fp.length - 1];
  let sammanfattning = `Bumpdiagram över ${u.fokusNamn}s plats bland ${flest} regioner år för år, ${intervall}. `
    + `Plats ${fa.p} ${periodKort(u.perioder[fa.i], u.vy)} och plats ${fb.p} ${periodKort(u.perioder[fb.i], u.vy)}.`;
  if (sammanfattning.length < 170) sammanfattning += " Alla platser finns i tabellvyn.";
  return {
    ...linje,
    typ: "bump",
    undertitel,
    sammanfattning,
    serier,
    etiketter: regioner.map((s) => ({ serieId: s.id, text: s.namn })),
    tabell: {
      caption: `${linje.titel}: plats bland regionerna per år`,
      kolumner: ["Region", ...periodKolumner(u)],
      rader: ordnade.map((s) => [s.namn, ...(s.platser ?? []).map((p) => (p === null ? null : String(p)))]),
      fokusRad: ordnade.findIndex((s) => s.roll === "fokus"),
    },
    hojdklass: "bump",
  };
}

function linjeForvantat(u: Underlag): ChartSpec {
  const f = u.kpi.format;
  const p = punkter(u, u.fokusId);
  const fasta = fastaBland(u, u.syskon.map((e) => e.id));
  const intervall = p
    .filter((q) => q.lo80 !== undefined && q.hi80 !== undefined)
    .map((q) => ({ x: q.period, lo: q.lo80 as number, hi: q.hi80 as number, ...(q.lo95 !== undefined ? { lo2: q.lo95 } : {}), ...(q.hi95 !== undefined ? { hi2: q.hi95 } : {}) }));
  const serier: SpecSerie[] = [
    { id: "forvantat", namn: "Förväntat intervall", roll: "forvantat", intervall },
    ...fasta.map((id, i): SpecSerie => ({ id, namn: kortNamn(enhet(u.kap, id)), roll: "markerad", enhetId: id, markeringIndex: i, punkter: punkter(u, id), interaktiv: true })),
    { id: u.fokusId, namn: u.fokusNamn, roll: "fokus", enhetId: u.fokusId, punkter: p, interaktiv: false },
  ];
  const b = bas(u, "tid");
  return {
    ...b,
    typ: "linje",
    etiketter: [
      { serieId: u.fokusId, text: u.fokusNamn },
      { serieId: "forvantat", text: "Förväntat intervall" },
      ...fasta.map((id) => ({ serieId: id, text: kortNamn(enhet(u.kap, id)) })),
    ],
    ...(u.syskon.length ? { jamforbara: jamforbaraFor(u, u.syskon.map((e) => e.id), Math.max(0, sistaMedVarde(p))), jamforNiva: jamforNivaFor(u.fokus.niva) } : {}),
    serier,
    x: { typ: "tid", noll: false, format: f },
    y: { typ: "linjar", noll: false, format: f },
    noter: tidsnoter(u, [u.fokusId]),
    tabell: {
      caption: b.titel,
      kolumner: ["Period", u.fokusNamn, "Förväntat värde", "Intervall 80 %, nedre", "Intervall 80 %, övre", "Läge"],
      rader: p.map((q) => [periodKort(q.period, u.vy), cell(q), q.yhat ?? null, q.lo80 ?? null, q.hi80 ?? null, q.signal && q.varde !== null ? STATUS_ORD[q.signal] : null]),
    },
    hojdklass: "standard",
  };
}

function stapelEllerLinje(u: Underlag): ChartSpec {
  const f = u.kpi.format;
  const stapel = u.tidTyp === "stapel";
  const p = punkter(u, u.fokusId);
  const fasta = stapel ? [] : fastaBland(u, u.syskon.map((e) => e.id));
  const ref = !stapel && u.referensId && referensForEnheter(u) ? u.referensId : undefined;
  const serier: SpecSerie[] = [
    ...(ref ? [{ id: ref, namn: enhet(u.kap, ref).namn, roll: "referens" as const, enhetId: ref, punkter: punkter(u, ref), interaktiv: false }] : []),
    ...fasta.map((id, i): SpecSerie => ({ id, namn: kortNamn(enhet(u.kap, id)), roll: "markerad", enhetId: id, markeringIndex: i, punkter: punkter(u, id), interaktiv: true })),
    { id: u.fokusId, namn: u.fokusNamn, roll: "fokus", enhetId: u.fokusId, punkter: p, interaktiv: false },
  ];
  const etiketter = stapel ? [] : [
    { serieId: u.fokusId, text: u.fokusNamn },
    ...(ref ? [{ serieId: ref, text: enhet(u.kap, ref).namn }] : []),
    ...fasta.map((id) => ({ serieId: id, text: kortNamn(enhet(u.kap, id)) })),
  ];
  const b = bas(u, "tid");
  return {
    ...b,
    typ: stapel ? "stapel" : "linje",
    etiketter,
    ...(!stapel && u.syskon.length ? { jamforbara: jamforbaraFor(u, u.syskon.map((e) => e.id), Math.max(0, sistaMedVarde(p))), jamforNiva: jamforNivaFor(u.fokus.niva) } : {}),
    serier,
    x: { typ: "tid", noll: false, format: f },
    y: { typ: "linjar", noll: stapel, format: f },
    noter: tidsnoter(u, [u.fokusId]),
    tabell: {
      caption: b.titel,
      kolumner: ["Period", u.fokusNamn, ...(ref ? [enhet(u.kap, ref).namn] : [])],
      rader: p.map((q, i) => [periodKort(q.period, u.vy), cell(q), ...(ref ? [cell(punkter(u, ref)[i])] : [])]),
    },
    hojdklass: "standard",
  };
}

// ── Rangordning ──

function rangSpec(u: Underlag, visning: "rang" | "enheterRang"): ChartSpec {
  const f = u.kpi.format;
  const r = rangordning(u, visning);
  const rader = r.rader.filter((x) => x.varde !== null);
  const fasta = fastaBland(u, rader.map((x) => x.enhetId));
  const serier: SpecSerie[] = rader.map((x) => {
    const fokus = visning === "rang" && x.enhetId === u.fokusId;
    const fi = fasta.indexOf(x.enhetId);
    const s: SpecSerie = {
      id: x.enhetId, namn: x.namn, roll: fokus ? "fokus" : fi >= 0 ? "markerad" : "kontext",
      enhetId: x.enhetId, varde: x.varde as number, interaktiv: !fokus,
    };
    if (fi >= 0) s.markeringIndex = fi;
    if (x.plats !== undefined) s.plats = x.plats;
    return s;
  });
  if (r.referens) serier.push({ id: r.referens.enhetId, namn: r.referens.namn, roll: "referens", enhetId: r.referens.enhetId, varde: r.referens.varde, interaktiv: false });

  // Topp 3: en linje under tredje platsen, bara för regioner och mått med riktning.
  const etiketter: ChartSpec["etiketter"] = [];
  if (visning === "rang" && u.kpi.riktning !== "neutral") {
    const ovanfor = rader.filter((x) => x.plats !== undefined && x.plats <= 3).length;
    if (ovanfor > 0 && ovanfor < rader.length) {
      serier.push({ id: "topp3", namn: "topp 3", roll: "grans", varde: ovanfor });
      etiketter.push({ serieId: "topp3", text: "topp 3" });
    }
  }
  if (visning === "rang" && rader.some((x) => x.enhetId === u.fokusId)) etiketter.unshift({ serieId: u.fokusId, text: u.fokusNamn });
  if (r.referens) etiketter.push({ serieId: r.referens.enhetId, text: r.referens.namn });
  fasta.forEach((id) => etiketter.push({ serieId: id, text: rader.find((x) => x.enhetId === id)?.namn ?? id }));

  const noter: Not[] = [];
  if (r.utanVarde > 0) {
    const ord = visning === "rang" ? NIVA_ORD.region : NIVA_ORD[barnNiva(u)];
    noter.push({ typ: "fotnot", text: `${versal(r.utanVarde === 1 ? `en ${ord.en}` : `${antalILoptext(r.utanVarde)} ${ord.flera}`)} saknar värde ${periodKort(r.period, u.vy)}.` });
  }
  if (r.rader.some((x) => x.undertryckt)) noter.push(...undertrycktNot(u, r.rader.map((x) => x.enhetId)));

  const b = bas(u, visning);
  // Kolumnen Plats bara när måttet har riktning; neutrala mått rangordnas bara efter värde.
  const harPlats = rader.some((x) => x.plats !== undefined);
  const platsCell = (x: { plats?: number }) => (harPlats ? [x.plats !== undefined ? String(x.plats) : null] : []);
  const tabellRader: (string | number | null)[][] = r.rader.map((x) => [...platsCell(x), x.namn, x.undertryckt ? UNDERTRYCKT : x.varde]);
  if (r.referens) tabellRader.push([...platsCell({}), r.referens.namn, r.referens.varde]);
  const fokusRad = r.rader.findIndex((x) => x.enhetId === u.fokusId);
  return {
    ...b,
    typ: "rangordning",
    etiketter,
    ...(visning === "rang" ? { jamforbara: jamforbaraFor(u, u.regioner, r.index), jamforNiva: jamforNivaFor("region") } : {}),
    serier,
    x: { typ: "linjar", noll: false, format: f },
    y: { typ: "kategori", noll: false, format: f },
    noter,
    tabell: {
      caption: b.titel,
      kolumner: [...(harPlats ? ["Plats"] : []), visning === "rang" ? "Region" : versal(NIVA_ORD[barnNiva(u)].en), "Värde"],
      rader: tabellRader,
      ...(fokusRad >= 0 ? { fokusRad } : {}),
    },
    hojdklass: "rangordning",
    ...(harPlats ? { platsAv: [rader.length] } : {}),
    ...(r.period ? { period: { iso: r.period, vy: u.vy, text: periodKort(r.period, u.vy) } } : {}),
    // Enheternas rader kan bli fokus (nedborrning, stilguiden 6.7); regionernas kan inte
    ...(visning === "enheterRang" ? { borrbar: true } : {}),
  };
}

// ── Små multiplar ──

/**
 * Panelernas visningsordning (stilguiden 6.6): bäst först enligt indikatorns
 * riktning, efter värde (störst först) för neutrala mått. Senaste värdet med
 * värde avgör; paneler utan värde sist.
 */
function ordnaPaneler(u: Underlag, enheter: Enhet[]): Enhet[] {
  const senaste = (id: string) => {
    const p = punkter(u, id);
    const i = sistaMedVarde(p);
    return i < 0 ? null : (p[i].varde as number);
  };
  const tecken = u.kpi.riktning === "lag" ? 1 : -1;
  return [...enheter].sort((a, b) => {
    const va = senaste(a.id), vb = senaste(b.id);
    if (va === null || vb === null) return (va === null ? 1 : 0) - (vb === null ? 1 : 0) || a.namn.localeCompare(b.namn, "sv");
    return tecken * (va - vb) || a.namn.localeCompare(b.namn, "sv");
  });
}

function smaMultiplar(u: Underlag): ChartSpec {
  const index = indexera(u);
  const f = index ? INDEXFORMAT : u.kpi.format;
  const paneler = ordnaPaneler(u, panelEnheter(u));
  const visa = (id: string) => (index ? somIndex(punkter(u, id)) : punkter(u, id));
  const ref = referensForEnheter(u) && !index ? u.fokusId : undefined;

  const serier: SpecSerie[] = [
    ...(ref ? [{ id: ref, namn: u.fokusNamnLang, roll: "referens" as const, enhetId: ref, punkter: punkter(u, ref), interaktiv: false }] : []),
    ...paneler.map((e): SpecSerie => ({ id: e.id, namn: kortNamn(e), roll: "fokus", enhetId: e.id, punkter: visa(e.id), interaktiv: false })),
  ];
  const varden = serier.flatMap((s) => (s.punkter ?? []).map((p) => p.varde)).filter((v): v is number => v !== null);
  const doman: [number, number] | undefined = varden.length ? [Math.min(...varden), Math.max(...varden)] : undefined;

  const noter = tidsnoter(u, paneler.map((e) => e.id)).filter((n) => n.typ !== "lucka");
  if (index) noter.push({ typ: "skala", text: `Värdena är index där första perioden är 100, eftersom ${NIVA_ORD[barnNiva(u)].bestamd} skiljer sig mycket i storlek.` });
  if (u.barn.length > paneler.length) noter.push({ typ: "fotnot", text: `De ${tal(paneler.length)} största av ${tal(u.barn.length)} visas.` });

  const b = bas(u, "enheter");
  return {
    ...b,
    typ: "smaMultiplar",
    etiketter: ref ? [{ serieId: ref, text: u.fokusNamnLang }] : [],
    serier,
    paneler: paneler.map((e) => {
      const status = u.kpi.serier[e.id]?.status;
      return { enhetId: e.id, titel: kortNamn(e), ...(status ? { status } : {}) };
    }),
    x: { typ: "tid", noll: false, format: f },
    y: { typ: "linjar", noll: false, format: f, ...(doman ? { doman } : {}) },
    noter,
    tabell: {
      caption: b.titel,
      kolumner: ["Period", ...paneler.map((e) => kortNamn(e)), ...(ref ? [u.fokusNamnLang] : [])],
      rader: u.perioder.map((p, i) => [
        periodKort(p, u.vy),
        ...paneler.map((e) => cell(visa(e.id)[i])),
        ...(ref ? [cell(punkter(u, ref)[i])] : []),
      ]),
    },
    hojdklass: "kompakt",
    borrbar: true,
  };
}

// ── Ingångar ──

/** Specen för en indikator och visning. Visningar som datan inte räcker till ger "tid". */
export function kpiTillSpec(kpi: KpiModell, kap: KapitelModell, ctx: SpecKontext, visning: VisningId): ChartSpec {
  const u = underlag(kpi, kap, ctx);
  switch (giltigVisning(u, visning)) {
    case "tid":
      if (u.tidTyp === "regioner") return linjeRegioner(u);
      if (u.tidTyp === "forvantat") return linjeForvantat(u);
      return stapelEllerLinje(u);
    case "rang": return bumpSpec(u) ?? rangSpec(u, "rang");
    case "enheter": return smaMultiplar(u);
    case "enheterRang": return rangSpec(u, "enheterRang");
  }
}

/**
 * Minidiagrammet i översiktstabellen (stilguiden 5.8, 6.6): bara fokusserien,
 * aldrig fristående. Perioder som ingen serie i indikatorn har (inte mätta,
 * t.ex. åren mellan enkäter) tas bort, så att linjen inte bryts där; riktiga
 * luckor står kvar som null.
 */
export function minidiagramSpec(kpi: KpiModell, kap: KapitelModell, ctx: SpecKontext): ChartSpec {
  const u = underlag(kpi, kap, { ...ctx, fasta: [], fristaende: false });
  const f = kpi.format;
  const matt = mattPeriod(u);
  const p = punkter(u, u.fokusId).filter((_, i) => matt(i));
  return {
    id: [kpi.id, "mini", u.fokusId !== kpi.fokus ? u.fokusId : ""].filter(Boolean).join(":"),
    typ: "minidiagram",
    titel: "Över tid",
    undertitel: figurUndertitel(kpi, kap, ctx, "tid"),
    etiketter: [],
    serier: [{ id: u.fokusId, namn: u.fokusNamn, roll: "fokus", enhetId: u.fokusId, punkter: p }],
    x: { typ: "tid", noll: false, format: f },
    y: { typ: "linjar", noll: false, format: f },
    noter: [],
    sammanfattning: miniSammanfattning(kpi, kap, ctx),
    tabell: {
      caption: kpi.namn,
      kolumner: ["Period", u.fokusNamn],
      rader: p.map((q) => [periodKort(q.period, u.vy), cell(q)]),
    },
    hojdklass: "minidiagram",
  };
}

/** För tester och verktyg: kontrollerar textreglerna i en spec. Tom lista = inga fel. */
export function specTextfel(spec: ChartSpec): string[] {
  const fel: string[] = [];
  const em = String.fromCharCode(0x2014);
  const texter = [spec.titel, spec.undertitel, spec.sammanfattning, spec.kicker ?? "", spec.tabell.caption,
    ...spec.etiketter.map((e) => e.text), ...spec.noter.map((n) => n.text), ...spec.tabell.kolumner];
  if (texter.some((t) => t.includes(em))) fel.push("em dash i genererad text");
  if (antalMeningar(spec.undertitel) > 2) fel.push(`undertiteln har fler än två meningar: ${spec.undertitel}`);
  if (spec.titel.length > 120 || /[.?]$/.test(spec.titel)) fel.push(`titeln bryter mot 3.1: ${spec.titel}`);
  const n = spec.sammanfattning.length;
  if (n < 100 || n > 200) fel.push(`sammanfattningen är ${n} tecken: ${spec.sammanfattning}`);
  return fel;
}
