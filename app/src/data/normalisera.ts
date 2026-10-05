// data/normalisera.ts: dagens JSON (kontrakt v1) till KapitelModell
// (docs/arkitektur.md 4.1). Ägare: WP1.
//
// Kontrakt v2 skrivs av R tillsammans med v1-fälten (dubbelskrivning, arkitektur
// avsnitt 5), så v1-läsningen räcker även för v2-filer tills WP8 tas upp igen.
// Ingen DOM; allt här är rena funktioner.

import { antalILoptext, kronor, period as periodText, plats, procentenheter, tal } from "../design/format";
import { kapitelInfo } from "./kapitelinfo";
import { valideraKontrakt } from "./kontrakt";
import type { RaKpi, RaPunkt, RaSektion } from "./kontrakt";
import { HALLAND_ID, RIKET_ID } from "./modell";
import type {
  AvsnittModell, Enhet, EnhetSerie, Huvudpunkt, Kalla, KapitelModell, KpiModell, Not, Punkt,
  Status, TalFormat, VyId,
} from "./modell";

// ── Seriebrott ──

/**
 * Kända seriebrott per indikator, tills R levererar dem i `noter` (WP8).
 * `period` är första perioden med den nya metoden.
 */
export const SERIEBROTT: Record<string, { period: string; text: string }[]> = {
  "kolada-n79179": [{
    period: "2024-01-01",
    text: "Från 2024 hämtas telefontillgängligheten ur en ny källa. Jämför värden före och efter 2024 med försiktighet.",
  }],
};

// ── Perioder ──

const isoDag = (s: string) => s.slice(0, 10);

/** Nästa periods första dag. */
export function nastaPeriod(iso: string, vy: VyId): string {
  const [a, m, d] = isoDag(iso).split("-").map(Number);
  const t = new Date(Date.UTC(a, (m || 1) - 1, d || 1));
  switch (vy) {
    case "dag": t.setUTCDate(t.getUTCDate() + 1); break;
    case "vecka": t.setUTCDate(t.getUTCDate() + 7); break;
    case "manad": t.setUTCMonth(t.getUTCMonth() + 1); break;
    case "kvartal": t.setUTCMonth(t.getUTCMonth() + 3); break;
    case "ar": t.setUTCFullYear(t.getUTCFullYear() + 1); break;
  }
  return t.toISOString().slice(0, 10);
}

const MAX_STEG = 5000;

/**
 * Alla periodsteg från den första till den sista perioden i `perioder`.
 * Perioder som inte ligger på stegen (avvikande data) tas ändå med.
 */
export function periodRutnat(perioder: Iterable<string>, vy: VyId): string[] {
  const unika = [...new Set([...perioder].map(isoDag))].sort();
  if (unika.length < 2) return unika;
  const sista = unika[unika.length - 1];
  const steg: string[] = [];
  for (let p = unika[0]; p <= sista && steg.length < MAX_STEG; p = nastaPeriod(p, vy)) steg.push(p);
  return [...new Set([...steg, ...unika])].sort();
}

const tal_ = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** En rå punkt som Punkt med etikett enligt stilguiden 3.2. */
function tillPunkt(r: RaPunkt, vy: VyId): Punkt {
  const iso = isoDag(r.period);
  const ut: Punkt = { period: iso, etikett: periodText(iso, vy, "axel"), varde: tal_(r.varde) };
  const yhat = tal_(r.yhat), lo80 = tal_(r.yhat_lower_80), hi80 = tal_(r.yhat_upper_80);
  const lo95 = tal_(r.yhat_lower), hi95 = tal_(r.yhat_upper);
  if (yhat !== null) ut.yhat = yhat;
  if (lo80 !== null) ut.lo80 = lo80;
  if (hi80 !== null) ut.hi80 = hi80;
  if (lo95 !== null) ut.lo95 = lo95;
  if (hi95 !== null) ut.hi95 = hi95;
  if (r.signal) ut.signal = r.signal;
  return ut;
}

/** Lägger punkterna på rutnätet: en punkt per periodsteg, luckor som varde: null. */
export function fyllLuckor(punkter: Punkt[], rutnat: string[], vy: VyId): Punkt[] {
  const per = new Map(punkter.map((p) => [p.period, p]));
  return rutnat.map((iso) => per.get(iso) ?? { period: iso, etikett: periodText(iso, vy, "axel"), varde: null });
}

/** Värdet en viss period, null om det saknas. */
export const vardeVid = (serie: Punkt[] | undefined, iso: string): number | null =>
  serie?.find((p) => p.period === iso)?.varde ?? null;

/** Index för sista punkten med värde, -1 om ingen har värde. */
export function sistaMedVarde(serie: Punkt[]): number {
  for (let i = serie.length - 1; i >= 0; i--) if (serie[i].varde !== null) return i;
  return -1;
}

// ── Enheter ──

/** Id för en underliggande enhet: namnet som slug ("Halmstad" → "halmstad"). */
export function slug(namn: string): string {
  return namn.toLowerCase()
    .replace(/[åä]/g, "a").replace(/ö/g, "o").replace(/é/g, "e")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Format, riktning och aggregering ──

const EM_DASH = String.fromCharCode(0x2014);

/** Kolada-titeln: beskrivningens första del, före tankstrecket och källhänvisningen. */
export function koladaTitel(beskrivning: string | undefined): string | undefined {
  if (!beskrivning) return undefined;
  const t = beskrivning.split(` ${EM_DASH} `)[0].trim();
  return t || undefined;
}

const KRONOR = /(?<![\p{L}\p{N}])(kr|kronor)(?!\p{L})/iu;

/** Anger beskrivningen att måttet är i kronor? Titeln ("kr/inv") eller texten ("i kronor"). */
export function arKronor(beskrivning: string | undefined): boolean {
  const titel = koladaTitel(beskrivning);
  return (!!titel && KRONOR.test(titel)) || /\bi kronor\b/i.test(beskrivning ?? "");
}

function talFormat(raw: RaKpi, varden: number[]): TalFormat {
  if (raw.enhet === "procent") return { enhet: "procent", decimaler: 1, etikett: "%" };
  if (raw.enhet === "minuter") return { enhet: "minuter", decimaler: 0, etikett: "min" };
  if (arKronor(raw.beskrivning)) return { enhet: "kronor", decimaler: 0, etikett: "kr" };
  // Antal är heltal enligt stilguiden 3.2, men Koladas kvoter ("antal/100
  // vårdplatser" = 0,6) blir meningslösa utan decimal.
  const brak = varden.some((v) => !Number.isInteger(v));
  const max = Math.max(0, ...varden.map(Math.abs));
  return { enhet: "antal", decimaler: brak && max < 1000 ? 1 : 0, etikett: "" };
}

function aggregering(raw: RaKpi, format: TalFormat): KpiModell["aggregering"] {
  if (format.enhet === "procent") return "andel";
  if (format.enhet === "antal" && !raw.kontext_serier?.length) return "summa";
  return "medel";
}

function riktning(raw: RaKpi): KpiModell["riktning"] {
  if (raw.utan_mal) return "neutral";
  return raw.inverterad ? "lag" : "hog";
}

// ── Plats ──

/**
 * Plats per enhet med lika värden på samma plats (som R:s ties.method = "min").
 * Riktning "lag" = lägst värde bäst. Enheter utan värde får ingen plats.
 */
export function platser(varden: Map<string, number | null>, rikt: "hog" | "lag"): Map<string, number> {
  const med = [...varden].filter((e): e is [string, number] => e[1] !== null);
  const battre = (a: number, b: number) => (rikt === "hog" ? a > b : a < b);
  return new Map(med.map(([id, v]) => [id, 1 + med.filter(([, w]) => battre(w, v)).length]));
}

// ── En indikator ──

function normaliseraKpi(raw: RaKpi, vy: VyId, enheter: Map<string, Enhet>): KpiModell {
  const fokus = HALLAND_ID;
  const fokusPunkter = raw.tidsserie.map((p) => tillPunkt(p, vy));
  const kontext = raw.kontext_serier ?? [];
  const under = raw.undernivaer ?? [];

  // Ett gemensamt rutnät för alla serier i indikatorn, ett för dagarna.
  const rutnat = periodRutnat([
    ...raw.tidsserie.map((p) => p.period),
    ...kontext.flatMap((s) => s.tidsserie.map((p) => p.period)),
    ...(raw.riket_serie ?? []).map((p) => p.period),
    ...under.flatMap((u) => u.tidsserie.map((p) => p.period)),
  ], vy);
  const dagRutnat = periodRutnat([
    ...(raw.dagar ?? []).map((p) => p.period),
    ...under.flatMap((u) => (u.dagar ?? []).map((p) => p.period)),
  ], "dag");
  const dagar = (d: RaPunkt[] | undefined) => (d?.length ? fyllLuckor(d.map((p) => tillPunkt(p, "dag")), dagRutnat, "dag") : undefined);

  const tidsserie = fyllLuckor(fokusPunkter, rutnat, vy);
  const iSenaste = sistaMedVarde(tidsserie);
  const rankPeriod = iSenaste >= 0 ? tidsserie[iSenaste].period : rutnat[rutnat.length - 1];

  const serier: Record<string, EnhetSerie> = {};
  serier[fokus] = {
    enhet_id: fokus,
    senaste: tal_(raw.senaste) ?? (iSenaste >= 0 ? tidsserie[iSenaste].varde : null),
    tidsserie,
  };
  const f = serier[fokus];
  if (tal_(raw.forandring) !== null) f.forandring = raw.forandring;
  if (raw.status && !raw.utan_mal) f.status = raw.status;
  if (raw.rank !== undefined) f.rank = raw.rank;
  if (raw.rank_av !== undefined) f.rank_av = raw.rank_av;
  const fokusDagar = dagar(raw.dagar);
  if (fokusDagar) f.dagar = fokusDagar;

  for (const s of kontext) {
    if (s.id === fokus) continue;
    if (!enheter.has(s.id)) enheter.set(s.id, { id: s.id, namn: s.namn, niva: "region", parent_id: null });
    const ts = fyllLuckor(s.tidsserie.map((p) => tillPunkt(p, vy)), rutnat, vy);
    serier[s.id] = { enhet_id: s.id, senaste: vardeVid(ts, rankPeriod), tidsserie: ts };
  }
  if (raw.riket_serie?.length) {
    if (!enheter.has(RIKET_ID)) enheter.set(RIKET_ID, { id: RIKET_ID, namn: "Riket", niva: "riket", parent_id: null });
    const ts = fyllLuckor(raw.riket_serie.map((p) => tillPunkt(p, vy)), rutnat, vy);
    serier[RIKET_ID] = { enhet_id: RIKET_ID, senaste: vardeVid(ts, rankPeriod), tidsserie: ts };
  }

  // Plats för övriga regioner samma period. Hallands plats kommer från R
  // (räknad på oavrundade värden) och skrivs inte över.
  const rikt = riktning(raw);
  if (kontext.length && rikt !== "neutral") {
    const regionIds = Object.keys(serier).filter((id) => id !== RIKET_ID);
    const varden = new Map(regionIds.map((id) => [id, vardeVid(serier[id].tidsserie, rankPeriod)]));
    const p = platser(varden, rikt);
    for (const id of regionIds) {
      if (id === fokus || !p.has(id)) continue;
      serier[id].rank = p.get(id);
      serier[id].rank_av = p.size;
    }
  }

  for (const u of under) {
    const id = slug(u.namn) || u.id;
    if (!enheter.has(id)) enheter.set(id, { id, namn: u.namn, niva: "sjukhus", parent_id: fokus });
    const s: EnhetSerie = {
      enhet_id: id,
      senaste: tal_(u.senaste),
      tidsserie: fyllLuckor(u.tidsserie.map((p) => tillPunkt(p, vy)), rutnat, vy),
    };
    if (tal_(u.forandring) !== null) s.forandring = u.forandring;
    if (u.status && !raw.utan_mal) s.status = u.status;
    const d = dagar(u.dagar);
    if (d) s.dagar = d;
    serier[id] = s;
  }

  const varden = Object.values(serier).flatMap((s) => s.tidsserie.map((p) => p.varde)).filter((v): v is number => v !== null);
  const format = talFormat(raw, varden);

  const kpi: KpiModell = {
    id: raw.id,
    namn: raw.namn,
    format,
    aggregering: aggregering(raw, format),
    riktning: rikt,
    status: raw.utan_mal ? null : raw.status ?? null,
    fokus,
    serier,
    analystext: raw.analystext ?? "",
    noter: (SERIEBROTT[raw.id] ?? []).map((b): Not => ({ typ: "seriebrott", period: b.period, text: b.text, begrepp_id: "seriebrott" })),
  };
  if (raw.status_fg && !raw.utan_mal) kpi.status_fg = raw.status_fg;
  if (raw.referens && tal_(raw.referens.varde) !== null) {
    const iso = isoDag(raw.referens.period);
    kpi.jamforelse = kontext.length
      ? { typ: "riket", varde: raw.referens.varde, etikett: `Riket ${periodText(iso, vy, "kort")}`, period: iso }
      : { typ: "foregaende_period", varde: raw.referens.varde, etikett: periodText(iso, vy, "kort"), period: iso };
  }
  if (raw.topp3_band?.length) kpi.topp3_band = raw.topp3_band.map((b) => ({ period: isoDag(b.period), lo: b.lo, hi: b.hi }));
  if (raw.fakta) kpi.fakta = raw.fakta;
  if (raw.kalla) kpi.kalla = raw.kalla;
  if (raw.beskrivning) kpi.beskrivning = raw.beskrivning;
  if (raw.dagar_sammanfattning) kpi.dagar_sammanfattning = raw.dagar_sammanfattning;
  return kpi;
}

// ── Kapitlet ──

/**
 * Källa för indikatorer som saknar `kalla` i datan (akutflödet i dag), ur
 * kapitlets post i data/kapitelinfo.ts. Interna kapitel har regionen som
 * huvudman: "Regionens vårddatalager, Region Halland". undefined när kapitlet
 * saknas i kapitelinfo eller inte har någon källa där.
 */
export function reservkalla(kapitelId: string): Kalla | undefined {
  const info = kapitelInfo(kapitelId);
  if (!info?.kalla) return undefined;
  const intern = info.datatyp === "intern";
  const k: Kalla = {
    id: slug(info.kalla),
    namn: info.kalla,
    huvudman: intern ? "Region Halland" : "",
    typ: intern ? "Regionens egna system" : "Öppna jämförelser",
    om: intern ? ["Regionens egna system för vårddata.", info.notis].filter(Boolean).join(" ") : info.beskrivning,
  };
  if (info.takt) k.uppdatering = info.takt;
  return k;
}

/** Dagens JSON för ett kapitel och en tidsupplösning som KapitelModell. */
export function normalisera(raw: unknown, vy: VyId): KapitelModell {
  const fel = valideraKontrakt(raw);
  if (fel.length) throw new Error(`Ogiltig kapitelfil: ${fel.slice(0, 3).join("; ")}`);
  const s = raw as RaSektion;

  const enheter = new Map<string, Enhet>([
    [HALLAND_ID, { id: HALLAND_ID, namn: "Region Halland", kortnamn: "Halland", niva: "region", parent_id: null }],
  ]);
  const kpier = s.kpier.map((k) => normaliseraKpi(k, vy, enheter));
  const reserv = reservkalla(s.id);
  if (reserv) for (const k of kpier) k.kalla ??= reserv;
  const avsnitt: AvsnittModell[] = (s.delar ?? []).map((d) => ({ id: d.id, namn: d.namn, kpi_ids: [...d.kpi_ids] }));

  return {
    id: s.id,
    namn: s.namn,
    huvudpunkter: huvudpunkter(kpier, vy),
    enheter: [...enheter.values()],
    avsnitt,
    kpier,
    om_statistiken: s.inledning ?? [],
    kallor: s.kallor ?? [],
    leverans: s.leverans ?? [],
  };
}

// ── Huvudpunkter (Det viktigaste), en enkel regel tills R levererar dem ──

const STATUS_RANG: Record<Status, number> = { rod: 0, gul: 1, gron: 2 };
const NU: Record<Status, string> = { gron: "ligger nu i fas", gul: "är nu under bevakning", rod: "avviker nu" };
const FORE: Record<Status, string> = { gron: "ha legat i fas", gul: "ha varit under bevakning", rod: "ha avvikit" };
const PERIODORD: Record<VyId, string> = { dag: "dag", vecka: "vecka", manad: "månad", kvartal: "kvartal", ar: "år" };

/** Liten begynnelsebokstav, utom i förkortningar ("WHO:s", "LDL"). */
export function forstaLiten(s: string): string {
  if (s.length > 1 && /[\p{Lu}\p{N}]/u.test(s[1])) return s;
  return s.charAt(0).toLocaleLowerCase("sv") + s.slice(1);
}

/** Förändring i löptext med enhet: "2,4 procentenheter", "18 minuter", "2 350". */
function forandringText(v: number, format: TalFormat): string {
  const d = format.decimaler;
  switch (format.enhet) {
    case "procent": return procentenheter(v, 1, "lopande");
    case "minuter": return `${tal(v, d, "lopande")} minuter`;
    case "kronor": return kronor(v, d, "lopande");
    default: return tal(v, d, "lopande");
  }
}

/** Hallands plats en tidigare period, räknad ur regionernas värden. */
function tidigarePlats(kpi: KpiModell): { fran: number; period: string } | null {
  const fokus = kpi.serier[kpi.fokus];
  if (kpi.riktning === "neutral" || fokus.rank === undefined) return null;
  const i = sistaMedVarde(fokus.tidsserie);
  for (let j = i - 1; j >= 0; j--) {
    const iso = fokus.tidsserie[j].period;
    if (fokus.tidsserie[j].varde === null) continue;
    const regioner = Object.keys(kpi.serier).filter((id) => id !== RIKET_ID);
    const p = platser(new Map(regioner.map((id) => [id, vardeVid(kpi.serier[id].tidsserie, iso)])), kpi.riktning);
    const fran = p.get(kpi.fokus);
    return fran === undefined ? null : { fran, period: iso };
  }
  return null;
}

/**
 * Högst sex huvudpunkter, en mening var: statusbyten, bästa och sämsta
 * placering och största rörelse (stilguiden 3.4). Varje indikator nämns högst
 * en gång; placeringarna väljs först så att "bästa" alltid är kapitlets bästa.
 */
export function huvudpunkter(kpier: KpiModell[], vy: VyId): Huvudpunkt[] {
  const fg = PERIODORD[vy];
  const nbsp = String.fromCharCode(0x00a0);
  const tonFranStatus = (s: Status | null): Huvudpunkt["ton"] => (s === "gron" ? "positiv" : s === "rod" ? "negativ" : "neutral");
  const placeringar: Huvudpunkt[] = [];
  const reserverade = new Set<string>();
  const reservera = (p: Huvudpunkt) => { placeringar.push(p); if (p.kpi_id) reserverade.add(p.kpi_id); };

  const rankade = kpier.filter((k) => k.riktning !== "neutral" && k.serier[k.fokus]?.rank !== undefined && k.serier[k.fokus]?.rank_av !== undefined);
  const r = (k: KpiModell) => k.serier[k.fokus].rank as number;
  const av = (k: KpiModell) => k.serier[k.fokus].rank_av as number;
  const placering = (lista: KpiModell[], ord: "bästa" | "sämsta") => {
    const k = lista[0];
    const delade = lista.filter((x) => r(x) === r(k)).length;
    const text = delade > 1
      ? `Halland har plats${nbsp}${r(k)} för ${antalILoptext(delade)} indikatorer i kapitlet, bland dem ${forstaLiten(k.namn)}.`
      : `Kapitlets ${ord} placering är ${plats(r(k), av(k))} för ${forstaLiten(k.namn)}.`;
    reservera({ text, kpi_id: k.id, ton: tonFranStatus(k.status) });
  };

  if (rankade.length) {
    const basta = [...rankade].sort((a, b) => r(a) - r(b) || av(b) - av(a));
    placering(basta, "bästa");
    const samsta = [...rankade].filter((k) => r(k) > r(basta[0])).sort((a, b) => r(b) - r(a) || av(b) - av(a));
    if (samsta.length) placering(samsta, "sämsta");
    // Största rörelse i plats sedan förra mätningen.
    const m = rankade.filter((k) => !reserverade.has(k.id)).map((k) => ({ k, t: tidigarePlats(k) }))
      .filter((x): x is { k: KpiModell; t: { fran: number; period: string } } => !!x.t && x.t.fran !== r(x.k))
      .sort((a, b) => Math.abs(b.t.fran - r(b.k)) - Math.abs(a.t.fran - r(a.k)))[0];
    if (m) {
      reservera({
        text: `${m.k.namn} har gått från plats${nbsp}${m.t.fran} till plats${nbsp}${r(m.k)} sedan ${periodText(m.t.period, vy, "lopande")}.`,
        kpi_id: m.k.id,
        ton: r(m.k) < m.t.fran ? "positiv" : "negativ",
      });
    }
  } else {
    // Utan placeringar: största relativa förändring mot föregående period.
    const m = kpier.map((k) => {
      const s = k.serier[k.fokus];
      const d = s?.forandring;
      if (d === undefined || d === 0 || s.senaste === null) return null;
      const bas = Math.abs(s.senaste - d);
      return { k, d, rel: bas > 0 ? Math.abs(d) / bas : 0 };
    }).filter((x): x is { k: KpiModell; d: number; rel: number } => !!x).sort((a, b) => b.rel - a.rel)[0];
    if (m) {
      const okning = m.d > 0;
      const ton: Huvudpunkt["ton"] = m.k.riktning === "neutral" ? "neutral" : okning === (m.k.riktning === "hog") ? "positiv" : "negativ";
      reservera({ text: `${m.k.namn} ${okning ? "ökade" : "minskade"} med ${forandringText(Math.abs(m.d), m.k.format)} jämfört med föregående ${fg}.`, kpi_id: m.k.id, ton });
    }
  }

  const statusbyten: { p: Huvudpunkt; vikt: number }[] = [];
  for (const k of kpier) {
    if (!k.status || reserverade.has(k.id)) continue;
    const ts = k.serier[k.fokus]?.tidsserie ?? [];
    let fore = k.status_fg;
    for (let j = sistaMedVarde(ts) - 1; !fore && j >= 0; j--) if (ts[j].varde !== null) fore = ts[j].signal ?? undefined;
    if (!fore || fore === k.status) continue;
    statusbyten.push({
      p: { text: `${k.namn} ${NU[k.status]}, efter att ${FORE[fore]} föregående ${fg}.`, kpi_id: k.id, ton: STATUS_RANG[k.status] > STATUS_RANG[fore] ? "positiv" : "negativ" },
      vikt: Math.abs(STATUS_RANG[k.status] - STATUS_RANG[fore]),
    });
  }
  statusbyten.sort((a, b) => b.vikt - a.vikt);

  const byten = statusbyten.map((s) => s.p);
  return [...byten.slice(0, 3), ...placeringar, ...byten.slice(3)].slice(0, 6);
}
