// charts/text.ts: figurens titel, undertitel och textsammanfattning enligt
// stilguiden 6.2, 6.8 och 3.2. Ägare: WP1. Rena funktioner.
//
// Titeln är beskrivande och upprepar aldrig indikatornamnet eller perioden.
// Undertiteln har högst två meningar i fast ordning: mått och enhet. Population,
// period. Måttet hämtas ur `fakta.matt` (första ledet) eller Kolada-titeln,
// aldrig ur beskrivningens källhänvisning. Sammanfattningen (aria-label) är
// 100–200 tecken.

import type { KapitelModell, KpiModell, Punkt, TalFormat, VyId } from "../data/modell";
import { forstaLiten, koladaTitel, sistaMedVarde } from "../data/normalisera";
import { DASH, HART, antalILoptext, isoVecka, period, periodIntervall, plats, varde } from "../design/format";
import type { SpecKontext, VisningId } from "./spec";
import {
  NIVA_ORD, PERIODORD, barnNiva, giltigVisning, indexera, omfang, panelEnheter, punkter, rangordning, referensForEnheter, underlag,
} from "./underlag";
import type { Underlag } from "./underlag";

// ── Hjälpare ──

/** Stor begynnelsebokstav. */
export const versal = (s: string) => s.charAt(0).toLocaleUpperCase("sv") + s.slice(1);

/** Antal först i en mening: "Tre", "21". */
const antalForst = (n: number) => versal(antalILoptext(n));

/**
 * Antal meningar. Ett meningsslut är . ! ? följt av blanksteg och versal eller
 * siffra, eller textens slut. Förkortningar (kv., v., inv., p.e., t.ex.) räknas inte.
 */
export function antalMeningar(text: string): number {
  const t = text.trim().replace(/(?<![\p{L}])(kv|v|inv|p\.e|t\.ex|bl\.a|ca|nr)\./giu, "$1§");
  if (!t) return 0;
  return (t.match(/[.!?](?=\s+[\p{Lu}\p{N}]|\s*$)/gu) ?? []).length || 1;
}

const ENHET_LED = /^(andel|antal|kr\b|kr\/|kronor|index|\(%\))/i;

/** Koladas enhetsled som text: "kr/inv" → "kronor per invånare", "andel (%)" → "procent". */
function koladaEnhet(led: string): string {
  return led.trim().replace(/\s+/g, " ")
    .replace(/^andel\s*\(%\)/i, "procent")
    .replace(/^\(%\)/, "procent")
    .replace(/(?<!\p{L})kr(?!\p{L})/gu, "kronor")
    .replace(/(?<!\p{L})inv(?!\p{L})/gu, "invånare")
    .replace(/\s*\/\s*/g, " per ")
    // Tusental med hårt mellanslag (stilguiden 3.2): "100 000", "1000" → "1 000".
    .replace(/(\d) (\d{3})/g, `$1${HART}$2`)
    .replace(/(?<!\d)(\d)(\d{3})(?!\d)/g, `$1${HART}$2`);
}

/** Första ledet i en faktatext: första meningen, kortad vid första kommat om den är lång. */
function forstaLed(text: string): string {
  let t = text.trim().split(/(?<=[.!?])\s+/)[0].replace(/[.!?]$/, "");
  const komma = t.indexOf(", ");
  if (komma > 0 && t.slice(0, komma).split(/\s+/).length >= 4) t = t.slice(0, komma);
  return t;
}

/** Måttets enhet när datan inte säger mer: ur formatet. */
function enhetUrFormat(kpi: KpiModell, vy: VyId): string | undefined {
  switch (kpi.format.enhet) {
    case "procent": return "procent";
    case "minuter": return "minuter";
    case "kronor": return "kronor";
    case "per_invanare": return `per 100${HART}000 invånare`;
    case "kvot": return undefined;
    case "antal": return kpi.aggregering === "summa" ? `antal per ${PERIODORD[vy]}` : undefined;
  }
}

/**
 * Undertitelns första mening utan slutpunkt: mått och enhet.
 * "Andelen inkommande telefonsamtal till primärvården som besvarats samma dag, procent"
 */
export function mattOchEnhet(kpi: KpiModell, vy: VyId, indexerad = false): string {
  let matt = kpi.namn;
  let enhet: string | undefined;
  const titel = koladaTitel(kpi.beskrivning);
  if (titel) {
    const t = titel.replace(/\s*\(-\d{4}\)/g, "").replace(/[.\s]+$/, "").replace(/\s+/g, " ");
    const delar = t.split(/,\s*/);
    const j = delar.findIndex((d, i) => i > 0 && ENHET_LED.test(d));
    if (j > 0) {
      matt = [...delar.slice(0, j), ...delar.slice(j + 1)].join(", ");
      enhet = koladaEnhet(delar[j]);
    } else {
      matt = t;
    }
  }
  if (kpi.fakta?.matt) matt = forstaLed(kpi.fakta.matt);
  if (indexerad) enhet = "index med första perioden som 100";
  enhet ??= enhetUrFormat(kpi, vy);
  return versal(enhet ? `${matt}, ${enhet}` : matt);
}

/** Ett värde i löptext med indikatorns format. */
const lopande = (v: number | null | undefined, f: TalFormat) => varde(v, f, "lopande");

/**
 * En period i löptext. Veckor får år ("vecka 13 2026") eftersom serierna
 * spänner över flera år; format.period ger bara "vecka 13".
 */
export function periodLopande(iso: string, vy: VyId): string {
  if (vy !== "vecka") return period(iso, vy, "lopande");
  const v = isoVecka(iso);
  return `vecka ${v.vecka} ${v.ar}`;
}

/** Mellanslagen i en periodtext blir hårda (U+00A0), så att "apr 2024" inte bryts. */
export const utanBrytning = (s: string) => s.replace(/ /g, HART);

/** En period som text i undertitel, not och tabellhuvud: "2025", "mar 2026", "kv. 1 2026", utan radbrytning. */
export const periodKort = (iso: string, vy: VyId) => utanBrytning(period(iso, vy, "kort"));

/** Periodintervall i undertitel ("kort", utan radbrytning inom perioderna) eller sammanfattning ("lopande"). */
function periodSpann(fran: string, till: string, vy: VyId, stil: "kort" | "lopande"): string {
  if (stil === "kort") return utanBrytning(periodIntervall(fran, till, vy, stil));
  if (vy !== "vecka") return periodIntervall(fran, till, vy, stil);
  const a = periodLopande(fran, vy), b = periodLopande(till, vy);
  return a === b ? a : `${a}${DASH}${b}`;
}

/** Periodintervall för de serier som visas: "2016–2025", "jan 2021–mar 2026". */
function intervallFor(u: Underlag, ids: string[], stil: "kort" | "lopande"): string {
  if (!u.perioder.length) return "";
  const o = omfang(u, ids) ?? { fran: 0, till: u.perioder.length - 1 };
  return periodSpann(u.perioder[o.fran], u.perioder[o.till], u.vy, stil);
}

/** "år 2024", "i mars 2026", "under kvartal 4 2025", "den 30 mars 2026". */
function narText(iso: string, vy: VyId): string {
  const p = periodLopande(iso, vy);
  switch (vy) {
    case "ar": return `år ${p}`;
    case "manad": return `i ${p}`;
    case "dag": return `den ${p}`;
    default: return `under ${p}`;
  }
}

/** Senaste och föregående värde i en serie, för "Ökat från …". */
function utveckling(p: Punkt[], f: TalFormat, vy: VyId): string | null {
  const i = sistaMedVarde(p);
  let j = i - 1;
  while (j >= 0 && p[j].varde === null) j--;
  if (i < 0 || j < 0) return null;
  const a = p[j].varde as number, b = p[i].varde as number;
  if (varde(a, f) === varde(b, f)) return `Oförändrat sedan ${periodLopande(p[j].period, vy)}.`;
  return `${b > a ? "Ökat" : "Minskat"} från ${lopande(a, f)} ${narText(p[j].period, vy)}.`;
}

/** Perioder i en uppräkning: "2023 och 2024", "2016–2018 och 2021". */
export function periodLista(perioder: string[], alla: string[], vy: VyId): string {
  const index = perioder.map((p) => alla.indexOf(p)).sort((a, b) => a - b);
  const grupper: [number, number][] = [];
  for (const i of index) {
    const g = grupper[grupper.length - 1];
    if (g && i === g[1] + 1) g[1] = i; else grupper.push([i, i]);
  }
  // Två perioder i följd skrivs som två ("2023 och 2024"), tre eller fler som intervall.
  for (let k = grupper.length - 1; k >= 0; k--) {
    const [a, b] = grupper[k];
    if (b === a + 1) grupper.splice(k, 1, [a, a], [b, b]);
  }
  const text = grupper.map(([a, b]) => utanBrytning(a === b ? period(alla[a], vy, "kort") : periodIntervall(alla[a], alla[b], vy, "kort")));
  return text.length > 1 ? `${text.slice(0, -1).join(", ")} och ${text[text.length - 1]}` : text[0] ?? "";
}

/**
 * Om perioden mättes: någon serie i indikatorn har ett värde (eller ett
 * undertryckt värde) den perioden. Perioder som ingen serie har är inte mätta,
 * t.ex. åren mellan enkäter som görs vartannat år, och är inga luckor.
 * Indikatorer utan andra serier än fokus räknas som mätta varje period.
 */
export function mattPeriod(u: Pick<Underlag, "kpi" | "dagar" | "fokusId">): (i: number) => boolean {
  const andra = Object.keys(u.kpi.serier).filter((id) => id !== u.fokusId);
  if (!andra.length) return () => true;
  const serier = Object.keys(u.kpi.serier).map((id) => punkter(u, id));
  return (i) => serier.some((p) => p[i] !== undefined && (p[i].varde !== null || !!p[i].undertryckt));
}

/** Saknade perioder i fokusserien (inte undertryckta, inte omätta). Tom sträng om inga saknas. */
export function luckText(u: Underlag): string {
  const p = punkter(u, u.fokusId);
  if (p.every((q) => q.varde === null && !q.undertryckt)) return "";
  const matt = mattPeriod(u);
  const saknas = p.filter((q, i) => q.varde === null && !q.undertryckt && matt(i)).map((q) => q.period);
  if (!saknas.length) return "";
  const lista = periodLista(saknas, u.perioder, u.vy);
  if (lista.split(/, | och /).length > 4) return `Värden saknas för ${u.fokusNamn} under ${antalILoptext(saknas.length)} perioder.`;
  return `${versal(lista)} saknas för ${u.fokusNamn}.`;
}

/** Sätter ihop meningar till 100–200 tecken: grunden först, sedan tillägg så länge de ryms. */
function inom200(grund: string[], tillagg: string[]): string {
  let t = grund.join(" ");
  if (t.length > 200) {
    // Bara första meningen, kortad vid ordgräns.
    t = grund[0];
    if (t.length > 200) t = `${t.slice(0, 199).replace(/\s+\S*$/, "")}.`;
  }
  for (const s of tillagg) if (s && t.length + 1 + s.length <= 200) t = `${t} ${s}`;
  if (t.length < 100) t = `${t} Alla värden finns i tabellvyn.`;
  return t;
}

// ── Titel, undertitel, sammanfattning ──

/** Figurens titel (stilguiden 6.2). */
export function figurTitel(kpi: KpiModell, kap: KapitelModell, ctx: SpecKontext, visning: VisningId): string {
  const u = underlag(kpi, kap, ctx);
  switch (giltigVisning(u, visning)) {
    case "tid":
      if (u.tidTyp === "regioner") return `${u.fokusNamn} jämfört med övriga ${NIVA_ORD[u.fokus.niva].flera}`;
      if (u.tidTyp === "forvantat") return "Mot förväntat intervall";
      return "Över tid";
    case "rang": return `${versal(NIVA_ORD.region.bestamd)} rangordnade`;
    case "enheter": return `Per ${NIVA_ORD[barnNiva(u)].en}`;
    case "enheterRang": return `${versal(NIVA_ORD[barnNiva(u)].bestamd)} rangordnade`;
  }
}

/** Figurens undertitel: mått och enhet. Population, period. */
export function figurUndertitel(kpi: KpiModell, kap: KapitelModell, ctx: SpecKontext, visning: VisningId): string {
  const u = underlag(kpi, kap, ctx);
  const v = giltigVisning(u, visning);
  const matt = mattOchEnhet(kpi, u.vy, v === "enheter" && indexera(u));
  let andra: string;
  switch (v) {
    case "tid": {
      if (u.tidTyp === "regioner") {
        const n = 1 + u.regioner.length;
        andra = `${antalForst(n)} ${NIVA_ORD.region.flera}${u.referensId ? " och riket" : ""}, ${intervallFor(u, [u.fokusId, ...u.regioner], "kort")}`;
      } else if (u.tidTyp === "forvantat") {
        // Summamått har redan "per månad" i måttet.
        const per = kpi.aggregering === "summa" ? "" : `per ${PERIODORD[u.vy]} `;
        andra = `${u.fokusNamnLang}, ${per}${intervallFor(u, [u.fokusId], "kort")}`;
      } else {
        andra = `${u.fokusNamnLang}, ${intervallFor(u, [u.fokusId], "kort")}`;
      }
      break;
    }
    case "rang": {
      const r = rangordning(u, "rang");
      andra = `${antalForst(r.rader.length)} ${NIVA_ORD.region.flera} med värde, ${periodKort(r.period, u.vy)}`;
      break;
    }
    case "enheter": {
      const n = panelEnheter(u).length;
      const summa = kpi.aggregering === "summa" ? ` i ${u.fokusNamnLang}` : "";
      andra = `${antalForst(n)} ${NIVA_ORD[barnNiva(u)].flera}${summa}, ${intervallFor(u, u.barn.map((e) => e.id), "kort")}`;
      break;
    }
    case "enheterRang": {
      const r = rangordning(u, "enheterRang");
      const n = r.rader.filter((x) => x.varde !== null).length;
      andra = `${antalForst(n)} ${NIVA_ORD[barnNiva(u)].flera} med värde, ${periodKort(r.period, u.vy)}`;
      break;
    }
  }
  return `${matt}. ${andra}.`;
}

/**
 * Textsammanfattning för aria-label, 100–200 tecken (stilguiden 6.8):
 * "{Typ} som visar {mått} för Halland {period}. Senaste värde {x}, {plats}. {Utveckling}."
 */
export function textsammanfattning(kpi: KpiModell, kap: KapitelModell, ctx: SpecKontext, visning: VisningId): string {
  const u = underlag(kpi, kap, ctx);
  const f = kpi.format;
  const matt = forstaLiten(kpi.namn);
  const fokusP = punkter(u, u.fokusId);
  const i = sistaMedVarde(fokusP);
  const senaste = i >= 0 ? fokusP[i] : undefined;

  switch (giltigVisning(u, visning)) {
    case "tid": {
      const period = intervallFor(u, [u.fokusId], "lopande");
      const s = u.kpi.serier[u.fokusId];
      if (u.tidTyp === "forvantat") {
        const lage = !senaste || senaste.varde === null || senaste.lo80 === undefined || senaste.hi80 === undefined ? ""
          : senaste.varde > senaste.hi80 ? ", över förväntat intervall" : senaste.varde < senaste.lo80 ? ", under förväntat intervall" : ", inom förväntat intervall";
        return inom200(
          [`Linjediagram som visar ${matt} för ${u.fokusNamn} mot förväntat intervall, ${period}.`, `Senaste värde ${lopande(senaste?.varde, f)}${lage}.`],
          [utveckling(fokusP, f, u.vy) ?? ""],
        );
      }
      const typ = u.tidTyp === "stapel" ? "Stapeldiagram" : "Linjediagram";
      const platsText = u.tidTyp === "regioner" && s?.rank !== undefined && s.rank_av !== undefined ? `, ${plats(s.rank, s.rank_av)}` : "";
      const tillagg = [utveckling(fokusP, f, u.vy) ?? ""];
      const refRitas = u.tidTyp === "regioner" || (u.tidTyp === "linje" && referensForEnheter(u));
      if (u.referensId && senaste && refRitas) {
        const ref = punkter(u, u.referensId)[i]?.varde;
        if (ref !== null && ref !== undefined) tillagg.push(`${u.tidTyp === "regioner" ? "Riket" : versal(u.kap.enheter.find((e) => e.id === u.referensId)?.namn ?? "Referensen")} ${lopande(ref, f)}.`);
      }
      const luckor = luckText(u);
      if (luckor) tillagg.push(luckor);
      return inom200(
        [`${typ} som visar ${matt} för ${u.fokusNamn} ${period}.`, `Senaste värde ${lopande(senaste?.varde, f)}${platsText}.`],
        tillagg,
      );
    }
    case "rang": {
      const r = rangordning(u, "rang");
      const fokus = r.rader.find((x) => x.enhetId === u.fokusId);
      const p = periodLopande(r.period, u.vy);
      const fokusText = fokus ? `${u.fokusNamn} ${fokus.plats !== undefined ? `på ${plats(fokus.plats, r.rader.length)} ` : ""}med ${lopande(fokus.varde, f)}.` : `${u.fokusNamn} saknar värde.`;
      const basta = r.rader[0];
      return inom200(
        [`Rangordning av ${antalILoptext(r.rader.length)} regioner efter ${matt} ${p}.`, fokusText],
        [r.referens ? `Riket ${lopande(r.referens.varde, f)}.` : "", basta && basta.enhetId !== u.fokusId ? `Först ${basta.namn} med ${lopande(basta.varde, f)}.` : ""],
      );
    }
    case "enheter":
    case "enheterRang": {
      const rang = visning === "enheterRang";
      const r = rangordning(u, "enheterRang");
      const med = r.rader.filter((x) => x.varde !== null);
      const niva = NIVA_ORD[barnNiva(u)];
      const n = rang ? med.length : panelEnheter(u).length;
      const hogst = [...med].sort((a, b) => (b.varde as number) - (a.varde as number));
      const ytter = hogst.length >= 2
        ? `Högst ${hogst[0].namn} med ${lopande(hogst[0].varde, f)}, lägst ${hogst[hogst.length - 1].namn} med ${lopande(hogst[hogst.length - 1].varde, f)}.`
        : "";
      const forsta = rang
        ? `Rangordning av ${antalILoptext(n)} ${niva.flera} efter ${matt} ${periodLopande(r.period, u.vy)}.`
        : `Små multiplar som visar ${matt} för ${antalILoptext(n)} ${niva.flera}, ${intervallFor(u, u.barn.map((e) => e.id), "lopande")}.`;
      return inom200(
        [forsta],
        [ytter, r.referens ? `${u.fokusNamnLang} ${lopande(r.referens.varde, f)}.` : "", indexera(u) && !rang ? "Värdena visas som index." : ""],
      );
    }
  }
}

/** Sammanfattning för minidiagrammet i översiktstabellen. */
export function miniSammanfattning(kpi: KpiModell, kap: KapitelModell, ctx: SpecKontext): string {
  const u = underlag(kpi, kap, ctx);
  const p = punkter(u, u.fokusId);
  const i = sistaMedVarde(p);
  return inom200(
    [`Minidiagram som visar ${forstaLiten(kpi.namn)} för ${u.fokusNamn} ${intervallFor(u, [u.fokusId], "lopande")}.`, `Senaste värde ${lopande(i >= 0 ? p[i].varde : null, kpi.format)}.`],
    [utveckling(p, kpi.format, u.vy) ?? ""],
  );
}
