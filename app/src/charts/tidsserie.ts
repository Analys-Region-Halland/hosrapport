import * as d3 from "d3";
import type { TidsseriePoint } from "../types";
import type { Pt, BandPt, ToppBandPt, TidsserieSeries, TidsserieOpts } from "./types";
import { SIGNAL_COLORS, SIGNAL_LABELS, FONT, FONT_MONO, pinColor } from "./constants";
import { fmtVarde, fmtSuffix, fullEtikett } from "../utils/format";

// ════════════════════════════════════════
//  Stil — hämtad från kommundatas storgrafer (OWID-idiom): streckade
//  vågräta gridlinjer utan lodrät axel, ljus baslinje, H→V→H-connectors till
//  slutetiketterna, Halland i regiongrönt ovanpå ett grått fält av övriga
//  regioner. Allt annat får vara tyst.
// ════════════════════════════════════════

const C = {
  grid: "#d9d9d5",
  zero: "#b4b4af",
  axis: "#d9d9d5",
  axisText: "#5b5b5b",
  bg: "#d3d3cf",        // övriga regioner
  bgHover: "#55554f",   // hovrad region
  riket: "#55554f",
  forvantat: "#4a4a46",
  mal: "#4b5563",
  ref: "#a8a8a3",
  conn: "#a9a9a4",      // connectors
  extremLabel: "#8a8a86",
  kalla: "#9a9a96",
  ink: "#2d2e2d",
};

// ════════════════════════════════════════
//  Säsongsjämförelse — vilka punkter delar samma kalenderslot som
//  rapportperioden (sista punkten)? Beror på tidsupplösningen.
// ════════════════════════════════════════

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
}

function comparableMatcher(vy: string | undefined, last: Date): ((d: Date) => boolean) | null {
  switch (vy) {
    case "ar":      return () => true; // varje punkt är ett år → alla jämförbara
    case "manad":   return (d) => d.getMonth() === last.getMonth();
    case "kvartal": return (d) => Math.floor(d.getMonth() / 3) === Math.floor(last.getMonth() / 3);
    case "vecka":   return (d) => isoWeek(d) === isoWeek(last);
    default:        return null; // dag: ingen säsongsupprepning i en ettårsserie
  }
}

// ════════════════════════════════════════
//  Parsing — från TidsseriePoint[] till Pt/BandPt
// ════════════════════════════════════════

const parse = d3.timeParse("%Y-%m-%d");

export function parseTidsserie(raw: TidsseriePoint[]): { pts: Pt[]; band: BandPt[] } {
  const pts: Pt[] = [];
  const band: BandPt[] = [];
  for (const d of raw) {
    const date = parse(d.period);
    if (!date) continue;
    pts.push({ d: date, v: d.varde, signal: d.signal, etikett: d.etikett, period: d.period });
    if (d.yhat != null && d.yhat_lower != null) {
      band.push({
        d: date, lo: d.yhat_lower, hi: d.yhat_upper!,
        lo80: d.yhat_lower_80, hi80: d.yhat_upper_80, yhat: d.yhat,
      });
    }
  }
  return { pts, band };
}

export function parseSimpleSerie(raw: { period: string; etikett: string; varde: number }[]): Pt[] {
  return raw.map((d) => ({ d: parse(d.period)!, v: d.varde, etikett: d.etikett, period: d.period })).filter((d) => d.d);
}

// ════════════════════════════════════════
//  Textmätning (canvas) — exakt samma rendering som webbläsaren, så att
//  marginalerna räcker för etiketterna i stället för att gissa per tecken.
// ════════════════════════════════════════

const measureCtx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
function measureText(text: string, font: string): number {
  if (!measureCtx) return text.length * 7;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

// ════════════════════════════════════════
//  Anti-collision (slutetiketter)
// ════════════════════════════════════════

interface EndLabel {
  text: string;
  naturalY: number;
  yPos: number;
  color: string;
  weight: number;
  size: number;
}

function resolveOverlap(labels: EndLabel[], minGap: number, yMin: number, yMax: number) {
  labels.sort((a, b) => a.yPos - b.yPos);
  for (let iter = 0; iter < 24; iter++) {
    let moved = false;
    for (let i = 1; i < labels.length; i++) {
      const gap = labels[i].yPos - labels[i - 1].yPos;
      if (gap < minGap) {
        const shift = (minGap - gap) / 2 + 0.5;
        labels[i - 1].yPos -= shift;
        labels[i].yPos += shift;
        moved = true;
      }
    }
    for (const l of labels) l.yPos = Math.max(yMin, Math.min(yMax, l.yPos));
    if (!moved) break;
  }
}

// ════════════════════════════════════════
//  Interpolerat värde på en linje vid en given tidpunkt — så att hover
//  träffar linjen där pekaren faktiskt är, inte bara vid datapunkterna.
// ════════════════════════════════════════

const bisectPt = d3.bisector<Pt, Date>((d) => d.d).left;

function yAtX(pts: Pt[], t: number): number | null {
  if (pts.length === 0) return null;
  if (t < +pts[0].d || t > +pts[pts.length - 1].d) return null;
  const i = bisectPt(pts, new Date(t));
  if (i === 0) return pts[0].v;
  const a = pts[i - 1], b = pts[i];
  if (!b) return a.v;
  const span = +b.d - +a.d;
  const f = span > 0 ? (t - +a.d) / span : 0;
  return a.v + f * (b.v - a.v);
}

function nearestIdx(pts: Pt[], t: number): number {
  let i = Math.min(bisectPt(pts, new Date(t)), pts.length - 1);
  if (i > 0 && Math.abs(+pts[i - 1].d - t) < Math.abs(+pts[i].d - t)) i--;
  return i;
}

// ════════════════════════════════════════
//  Tooltip — tabellform som i kommundata: prick/streck, namn, värde, plats
// ════════════════════════════════════════

interface TipRow {
  namn: string;
  varde: number | null;
  color: string;
  bold?: boolean;
  dash?: boolean;
  plats?: string;
  svag?: boolean;
}

function swatch(r: TipRow): string {
  if (r.dash) {
    return `<span style="display:inline-block;width:11px;height:0;border-top:2px dashed ${r.color};vertical-align:middle;margin-right:7px"></span>`;
  }
  return `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${r.color};vertical-align:middle;margin-right:7px"></span>`;
}

function tipHtml(header: string, rows: TipRow[], fmt: (v: number) => string, fot?: string): string {
  let html = `<div style="font-family:${FONT};font-size:12.5px;font-weight:600;color:${C.ink};padding-bottom:5px;margin-bottom:4px;border-bottom:1px solid #ececea">${header}</div>`;
  html += `<table style="border-collapse:collapse;width:100%">`;
  for (const r of rows) {
    const fw = r.bold ? 600 : 400;
    const op = r.svag ? 0.75 : 1;
    html += `<tr style="opacity:${op}">`;
    html += `<td style="padding:2px 0;white-space:nowrap">${swatch(r)}<span style="font-family:${FONT};font-size:12px;font-weight:${fw};color:${r.color}">${r.namn}</span></td>`;
    html += `<td style="padding:2px 0 2px 14px;text-align:right;font-family:${FONT_MONO};font-size:12px;font-weight:${fw};color:${C.ink};font-feature-settings:'tnum';white-space:nowrap">${r.varde == null ? "–" : fmt(r.varde)}</td>`;
    html += `<td style="padding:2px 0 2px 8px;text-align:right;min-width:${r.plats ? 34 : 0}px;font-family:${FONT};font-size:10px;color:#a3a3a0;white-space:nowrap">${r.plats ?? ""}</td>`;
    html += `</tr>`;
  }
  html += `</table>`;
  if (fot) html += fot;
  return `<div style="background:#fff;border:1px solid #e4e4e0;border-radius:10px;padding:9px 13px 8px;box-shadow:0 6px 24px rgba(0,0,0,0.09);white-space:nowrap;min-width:170px">${html}</div>`;
}

// ════════════════════════════════════════
//  tidsserie() — gemensam D3-ritfunktion
// ════════════════════════════════════════

export function tidsserie(
  container: HTMLElement,
  series: TidsserieSeries,
  opts: TidsserieOpts,
): () => void {
  container.innerHTML = "";
  const {
    width, height, margins: mgIn, enhet, vy,
    xDomain, yDomain, yTickCount,
    showTitle = false, titleText, titleColor,
    showEndLabels = false, mainLabel,
    compact = false, denseThreshold = 30,
    decimals, suffix: sfxOverride,
    bare = false,
    singleBand = false,
    inverterad = false,
    kalla,
    pinned = [],
    onTogglePin,
  } = opts;

  const dec = decimals ?? (enhet === "procent" ? 1 : 0);
  const sfx = sfxOverride ?? fmtSuffix(enhet);
  const fmtV = (v: number) => fmtVarde(v, enhet, dec) + sfx;
  const { pts, band, kontextLinjer: kontextRaw, riketPts: riketRaw, refPts: refRaw, toppBand: toppRaw, malniva, color } = series;

  if (pts.length < 2) return () => {};

  // Klipp jämförelseserierna (övriga regioner, riket, topp3-band, föreg. år) vid
  // höger axelkant = sista perioden med Halland-data. Regioner med nyare data
  // skulle annars ritas ut förbi x-axeln.
  const xMaxMs = +((xDomain ? xDomain[1] : d3.max(pts, (d) => d.d)) as Date);
  const inomX = <T extends { d: Date }>(p: T): boolean => +p.d <= xMaxMs;
  const kontextLinjer = (kontextRaw ?? [])
    .map((k) => ({ namn: k.namn, pts: k.pts.filter(inomX) }))
    .filter((k) => k.pts.length > 1);
  const riketPts = riketRaw?.filter(inomX);
  const refPts = refRaw?.filter(inomX);
  const toppBand = toppRaw?.filter(inomX);
  const harKontext = kontextLinjer.length > 0;

  const dense = pts.length > denseThreshold;
  const huvudNamn = mainLabel || "Faktiskt";
  // Smal graf (mobil): korta regionnamnen så att plotytan inte äts upp
  const narrow = width < 520;
  const kort = (s: string) => narrow && s.length > 11 ? s.slice(0, 10) + "…" : s;

  // Fästa regioner — i den ordning de fästes (färgen följer ordningen)
  const pinnade = pinned
    .map((namn, i) => ({ namn, color: pinColor(i), line: kontextLinjer.find((k) => k.namn === namn) }))
    .filter((p): p is { namn: string; color: string; line: { namn: string; pts: Pt[] } } => !!p.line);
  const arPinnad = (namn: string) => pinnade.some((p) => p.namn === namn);

  // ── Typografi ──
  const axisFs = compact ? 10.5 : 12;
  const labelFs = compact ? 10 : 12;
  const mainLabelFs = compact ? 10.5 : 12.5;

  // ── Marginaler ──
  // Höger: mät de slutetiketter som faktiskt ska ritas, så att texten alltid
  // ryms (kommundata-mönstret). Connector-geometrin är H→V→H på 30 px.
  const CONN_GAP = 4, CONN_MID = 12, CONN_END = 22, TEXT_PAD = 4;
  const textX0 = CONN_GAP + CONN_END + TEXT_PAD;
  const mg = { ...mgIn };
  if (showEndLabels && !bare) {
    const texter: string[] = [huvudNamn];
    if (band && band.length > 0) texter.push("Förväntat");
    if (riketPts && riketPts.length > 0) texter.push("Riket");
    if (malniva != null) texter.push("Mål");
    if (refPts && refPts.length > 1 && !harKontext) texter.push("Föreg. år");
    for (const p of pinnade) texter.push(kort(p.namn));
    if (kontextLinjer.length > 1) {
      const sorterade = [...kontextLinjer].sort((a, b) => a.pts[a.pts.length - 1].v - b.pts[b.pts.length - 1].v);
      texter.push(kort(sorterade[0].namn), kort(sorterade[sorterade.length - 1].namn));
    }
    const maxW = Math.max(...texter.map((t) => measureText(t, `600 ${mainLabelFs}px ${FONT}`)));
    mg.r = Math.min(Math.max(mg.r, Math.ceil(textX0 + maxW + 6)), Math.round(width * 0.4));
  }
  if (kalla && !bare) mg.b = Math.max(mg.b, 48);

  let plotW = width - mg.l - mg.r;
  const plotH = height - mg.t - mg.b;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("display", "block");

  // ── Panelrubrik (kompakt, i SVG) ──
  if (showTitle && titleText) {
    svg.append("text")
      .attr("x", mg.l).attr("y", 16)
      .attr("font-size", "12px").attr("font-weight", "600")
      .attr("font-family", FONT).attr("fill", titleColor || color)
      .text(titleText);
  }

  const g = svg.append("g").attr("transform", `translate(${mg.l},${mg.t})`);

  // ── Y-skala: ticks som omsluter datan ──
  // Gridlinjerna ska alltid ligga en över högsta och en under lägsta värdet,
  // så att grafen varken klipper data eller lämnar tom luft.
  const allVals = [
    ...pts.map((d) => d.v),
    ...(band || []).flatMap((b) => [b.lo, b.hi, b.yhat]),
    ...kontextLinjer.flatMap((k) => k.pts.map((p) => p.v)),
    ...(riketPts || []).map((p) => p.v),
    ...(refPts || []).map((p) => p.v),
    ...(toppBand || []).flatMap((b) => [b.lo, b.hi]),
    ...(malniva != null ? [malniva] : []),
  ];
  const [dataMin, dataMax] = d3.extent(allVals) as [number, number];
  const span = dataMax - dataMin || Math.abs(dataMax) * 0.1 || 1;
  const [domMin, domMax] = yDomain ?? [dataMin - span * 0.04, dataMax + span * 0.04];

  const yScale = d3.scaleLinear().domain([domMin, domMax]).range([plotH, 0]);
  const tickTarget = yTickCount ?? (compact ? 3 : Math.round(Math.max(3, Math.min(6, plotH / 52))));
  const yTicks = yScale.ticks(tickTarget);
  if (yTicks.length >= 2) {
    const step = yTicks[1] - yTicks[0];
    let tMin = yTicks[0], tMax = yTicks[yTicks.length - 1];
    // Omslut datan (eller den delade domänen när en sådan getts)
    const [needMin, needMax] = yDomain ? [domMin, domMax] : [dataMin, dataMax];
    while (tMin > needMin) { tMin -= step; yTicks.unshift(tMin); }
    while (tMax < needMax) { tMax += step; yTicks.push(tMax); }
    yScale.domain([tMin, tMax]);
  }
  const tickStep = yTicks.length >= 2 ? yTicks[1] - yTicks[0] : 1;
  const tickDec = tickStep >= 1 ? 0 : tickStep >= 0.1 ? 1 : 2;
  const yFmt = (v: number) => {
    const s = v.toLocaleString("sv-SE", { minimumFractionDigits: tickDec, maximumFractionDigits: tickDec });
    return enhet === "procent" ? `${s}%` : s;
  };

  // Vänstermarginal: mät bredaste y-etiketten
  if (!bare) {
    const maxLabelW = Math.max(...yTicks.map((t) => measureText(yFmt(t), `400 ${axisFs}px ${FONT}`)));
    const autoLeft = Math.ceil(maxLabelW + 12);
    if (autoLeft > mg.l) {
      mg.l = autoLeft;
      plotW = width - mg.l - mg.r;
      g.attr("transform", `translate(${mg.l},${mg.t})`);
    }
  }

  const xScale = d3.scaleTime()
    .domain(xDomain || d3.extent(pts, (d) => d.d) as [Date, Date])
    .range([0, plotW]);

  // ── Gridlinjer + y-etiketter ──
  if (!bare) for (const t of yTicks) {
    const py = yScale(t);
    const isZero = Math.abs(t) < 1e-9;
    g.append("line")
      .attr("x1", 0).attr("x2", plotW)
      .attr("y1", py).attr("y2", py)
      .attr("stroke", isZero ? C.zero : C.grid)
      .attr("stroke-width", isZero ? 1 : 0.7)
      .attr("stroke-dasharray", isZero ? "none" : "4,4");
    g.append("text")
      .attr("x", -8).attr("y", py + (compact ? 3.5 : 4))
      .attr("text-anchor", "end")
      .attr("fill", C.axisText)
      .attr("font-size", `${axisFs}px`).attr("font-weight", "400")
      .attr("font-family", FONT)
      .style("font-feature-settings", '"tnum"')
      .text(yFmt(t));
  }

  // ── X-axel ──
  const lastPt = pts[pts.length - 1];
  const fmtAxisLabel = (pt: Pt) => {
    if (!pt) return "";
    if (pt.etikett && pt.period) return fullEtikett(pt.etikett, pt.period, vy);
    if (pt.etikett) {
      const yr = pt.d.getFullYear();
      if (vy === "dag" || vy === "vecka") return `${pt.etikett} ${yr}`;
      return pt.etikett;
    }
    return `${d3.timeFormat("%-d %b")(pt.d)} ${pt.d.getFullYear()}`;
  };

  if (!bare) {
    // Baslinje: ljus, som gridlinjerna men heldragen
    g.append("line")
      .attr("x1", 0).attr("x2", plotW)
      .attr("y1", plotH).attr("y2", plotH)
      .attr("stroke", C.axis).attr("stroke-width", 0.8);

    const xLabelY = compact ? plotH + 15 : plotH + 19;
    const axLabels = pts.map(fmtAxisLabel);
    const maxLabelW = Math.max(...axLabels.map((l) => measureText(l, `400 ${axisFs}px ${FONT}`)));
    const pad = Math.min(maxLabelW / 2, plotW / 2);
    let chosen: number[];
    if (vy === "ar") {
      // Vart femte år + första och sista; mellanår som krockar med ändarna tas bort
      const lastI = pts.length - 1;
      const kand = pts
        .map((p, i) => ({ i, yr: p.d.getFullYear() }))
        .filter(({ i, yr }) => i === 0 || i === lastI || yr % 5 === 0)
        .map(({ i }) => i);
      const x0 = xScale(pts[0].d), x1 = xScale(pts[lastI].d);
      chosen = kand.filter((i) =>
        i === 0 || i === lastI ||
        (Math.abs(xScale(pts[i].d) - x0) > maxLabelW + 10 && Math.abs(xScale(pts[i].d) - x1) > maxLabelW + 10));
    } else {
      // Jämnt fördelade i pixelrymden, snäppta till närmaste datapunkt
      const count = Math.max(2, Math.floor(plotW / (maxLabelW + 26)) + 1);
      const set = new Set<number>();
      for (let k = 0; k < count; k++) {
        const targetX = pad + (k / (count - 1)) * (plotW - 2 * pad);
        let bi = 0, bd = Infinity;
        for (let i = 0; i < pts.length; i++) {
          const d = Math.abs(xScale(pts[i].d) - targetX);
          if (d < bd) { bd = d; bi = i; }
        }
        set.add(bi);
      }
      chosen = [...set];
    }
    for (const i of chosen) {
      const px = xScale(pts[i].d);
      g.append("line")
        .attr("x1", px).attr("x2", px).attr("y1", plotH).attr("y2", plotH + 4)
        .attr("stroke", C.axis).attr("stroke-width", 0.8);
      const labelX = vy === "ar" ? px : Math.max(pad, Math.min(plotW - pad, px));
      g.append("text")
        .attr("x", labelX).attr("y", xLabelY)
        .attr("text-anchor", "middle").attr("fill", C.axisText)
        .attr("font-size", `${axisFs}px`).attr("font-family", FONT)
        .style("font-feature-settings", '"tnum"')
        .text(axLabels[i]);
    }
  }

  // ── Kurvgenerator ──
  const lineGen = d3.line<Pt>()
    .x((d) => xScale(d.d)).y((d) => yScale(d.v))
    .curve(d3.curveMonotoneX);

  // ── Topp 3-band: zonen mellan bästa och tredje bästa region per år ──
  if (toppBand && toppBand.length > 1) {
    g.append("path").datum(toppBand)
      .attr("d", d3.area<ToppBandPt>()
        .x((b) => xScale(b.d)).y0((b) => yScale(b.lo)).y1((b) => yScale(b.hi))
        .curve(d3.curveMonotoneX))
      .attr("fill", "#00AB60")
      .attr("opacity", compact ? 0.08 : 0.10);
  }

  // ── Kontextlinjer (övriga regioner) — grått fält bakom Halland ──
  type KontextRef = {
    namn: string;
    pts: Pt[];
    path: d3.Selection<SVGPathElement, Pt[], null, undefined>;
    color: string;      // färg när linjen lyfts (hover) eller är fäst
    pinnad: boolean;
    pinnbar: boolean;   // riket kan inte fästas — den har redan egen etikett
    lastY: number;
  };
  const kontextRefs: KontextRef[] = [];
  const bgWidth = compact ? 0.6 : 0.9;
  for (const kl of kontextLinjer) {
    const pin = pinnade.find((p) => p.namn === kl.namn);
    const path = g.append("path").datum(kl.pts)
      .attr("d", lineGen)
      .attr("fill", "none")
      .attr("stroke", pin ? pin.color : C.bg)
      .attr("stroke-width", pin ? (compact ? 1.3 : 1.8) : bgWidth)
      .attr("stroke-linejoin", "round")
      .attr("opacity", pin ? 0.95 : 0.9);
    kontextRefs.push({
      namn: kl.namn, pts: kl.pts, path,
      color: pin ? pin.color : C.bgHover, pinnad: !!pin, pinnbar: true,
      lastY: yScale(kl.pts[kl.pts.length - 1].v),
    });
  }
  // Fästa linjer överst i fältet, med slutprick
  for (const ref of kontextRefs) {
    if (!ref.pinnad) continue;
    ref.path.raise();
    const lp = ref.pts[ref.pts.length - 1];
    g.append("circle")
      .attr("cx", xScale(lp.d)).attr("cy", yScale(lp.v))
      .attr("r", compact ? 2.5 : 3.2).attr("fill", ref.color)
      .attr("stroke", "#fff").attr("stroke-width", 1.5);
  }

  // ── Riket (streckad, mörk) ──
  if (riketPts && riketPts.length > 1) {
    const riketPath = g.append("path").datum(riketPts)
      .attr("d", lineGen)
      .attr("fill", "none").attr("stroke", C.riket)
      .attr("stroke-width", compact ? 1.3 : 1.7)
      .attr("stroke-dasharray", compact ? "5,3" : "6,4")
      .attr("opacity", 0.9);
    const lp = riketPts[riketPts.length - 1];
    g.append("circle")
      .attr("cx", xScale(lp.d)).attr("cy", yScale(lp.v))
      .attr("r", compact ? 2.5 : 3.2).attr("fill", C.riket)
      .attr("stroke", "#fff").attr("stroke-width", 1.5);
    kontextRefs.push({
      namn: "Riket", pts: riketPts, path: riketPath,
      color: C.riket, pinnad: false, pinnbar: false, lastY: yScale(lp.v),
    });
  }

  // ── Målnivå (horisontell referenslinje) ──
  if (malniva != null) {
    const my = yScale(malniva);
    g.append("line")
      .attr("x1", 0).attr("x2", plotW).attr("y1", my).attr("y2", my)
      .attr("stroke", C.mal).attr("stroke-width", compact ? 1 : 1.2)
      .attr("stroke-dasharray", "2,3").attr("opacity", 0.75);
    if (!compact && !showEndLabels) {
      g.append("text")
        .attr("x", plotW - 2).attr("y", my - 4)
        .attr("text-anchor", "end").attr("fill", C.mal)
        .attr("font-size", "10px").attr("font-family", FONT)
        .attr("font-weight", "500").text("Mål");
    }
  }

  // ── Referenslinje (föregående år — bara om inga kontextserier) ──
  if (refPts && refPts.length > 1 && !harKontext) {
    g.append("path").datum(refPts)
      .attr("d", lineGen)
      .attr("fill", "none").attr("stroke", C.ref)
      .attr("stroke-width", 1.2)
      .attr("stroke-dasharray", compact ? "4,3" : "6,4")
      .attr("opacity", 0.7);
  }

  // ── Prediktionsband (95 % yttre, 80 % inre) ──
  if (band && band.length > 0) {
    g.append("path").datum(band)
      .attr("d", d3.area<BandPt>()
        .x((d) => xScale(d.d)).y0((d) => yScale(d.lo)).y1((d) => yScale(d.hi))
        .curve(d3.curveMonotoneX))
      .attr("fill", "#9aa5b1")
      .attr("opacity", compact ? 0.08 : singleBand ? 0.14 : (dense ? 0.08 : 0.10));

    const band80 = singleBand ? [] : band.filter((b) => b.lo80 != null);
    if (band80.length > 0) {
      g.append("path").datum(band80)
        .attr("d", d3.area<BandPt>()
          .x((d) => xScale(d.d)).y0((d) => yScale(d.lo80!)).y1((d) => yScale(d.hi80!))
          .curve(d3.curveMonotoneX))
        .attr("fill", "#9aa5b1")
        .attr("opacity", compact ? 0.14 : (dense ? 0.16 : 0.20));
    }

    g.append("path").datum(band)
      .attr("d", d3.line<BandPt>()
        .x((d) => xScale(d.d)).y((d) => yScale(d.yhat))
        .curve(d3.curveMonotoneX))
      .attr("fill", "none").attr("stroke", C.forvantat)
      .attr("stroke-width", compact ? 0.8 : (dense ? 1.0 : 1.3))
      .attr("stroke-dasharray", compact ? "3,3" : "5,4")
      .attr("opacity", compact ? 0.4 : 0.5);
  }

  // ── Hovrad region ritas här — ovanpå fältet men under Halland ──
  const focusPath = g.append("path")
    .attr("fill", "none").attr("stroke-linejoin", "round")
    .attr("opacity", 0).attr("pointer-events", "none");
  const focusEndDot = g.append("circle")
    .attr("r", compact ? 2.5 : 3.2).attr("stroke", "#fff").attr("stroke-width", 1.5)
    .attr("opacity", 0).attr("pointer-events", "none");

  // ── Halland: vit halo + grön linje ──
  const lineWidth = compact
    ? (dense ? 1.1 : 1.8)
    : (dense ? 1.4 : 2.6);
  if (harKontext || (band && band.length > 0)) {
    g.append("path").datum(pts)
      .attr("d", lineGen)
      .attr("fill", "none").attr("stroke", "#fff")
      .attr("stroke-width", lineWidth + 2.4)
      .attr("stroke-linejoin", "round").attr("stroke-linecap", "round")
      .attr("opacity", 0.9);
  }
  g.append("path").datum(pts)
    .attr("d", lineGen)
    .attr("fill", "none").attr("stroke", color)
    .attr("stroke-width", lineWidth)
    .attr("stroke-linejoin", "round").attr("stroke-linecap", "round");

  // ── Datapunkter (bara vid få datapunkter) ──
  if (!dense && !compact) {
    g.selectAll(".dot").data(pts).join("circle")
      .attr("cx", (d) => xScale(d.d)).attr("cy", (d) => yScale(d.v))
      .attr("r", 2.8)
      .attr("fill", color)
      .attr("stroke", "#fff").attr("stroke-width", 1.5);
  }

  // ── Säsongsmarkörer: samma kalenderslot som rapportperioden ──
  const last = pts[pts.length - 1];
  if (!bare && last && !harKontext) {
    const match = comparableMatcher(vy, last.d);
    if (match) {
      for (const p of pts) {
        if (p === last || !match(p.d)) continue;
        const cx = xScale(p.d), cy = yScale(p.v);
        g.append("circle").attr("cx", cx).attr("cy", cy)
          .attr("r", compact ? 4.5 : 6.5).attr("fill", color).attr("opacity", 0.10);
        g.append("circle").attr("cx", cx).attr("cy", cy)
          .attr("r", compact ? 2.6 : 3.4).attr("fill", "#fff")
          .attr("stroke", color).attr("stroke-width", compact ? 1.3 : 1.6);
      }
    }
  }

  // ── Senaste punkt: markerad slutprick ──
  if (last) {
    const lastCol = series.lastColor ?? color;
    const cx = xScale(last.d), cy = yScale(last.v);
    g.append("circle").attr("cx", cx).attr("cy", cy)
      .attr("r", compact ? 5 : 7).attr("fill", lastCol).attr("opacity", 0.14);
    g.append("circle").attr("cx", cx).attr("cy", cy)
      .attr("r", compact ? (dense ? 2.8 : 3.5) : 4.5).attr("fill", lastCol)
      .attr("stroke", "#fff").attr("stroke-width", 2);
  }

  // ── Slutetiketter med H→V→H-connectors ──
  const endLabelYs: number[] = []; // för att hover-etiketten inte ska krocka
  if (showEndLabels && !bare) {
    const labels: EndLabel[] = [];
    const push = (text: string, v: number, lcolor: string, weight = 400, size = labelFs) =>
      labels.push({ text, naturalY: yScale(v), yPos: yScale(v), color: lcolor, weight, size });

    push(huvudNamn, lastPt.v, color, 600, mainLabelFs);
    if (band && band.length > 0) push("Förväntat", band[band.length - 1].yhat, C.forvantat);
    if (riketPts && riketPts.length > 0) push("Riket", riketPts[riketPts.length - 1].v, C.riket, 500);
    for (const p of pinnade) push(kort(p.namn), p.line.pts[p.line.pts.length - 1].v, p.color, 500);
    // Högsta och lägsta region etiketteras (senaste värdet) — om de inte redan är fästa
    if (kontextLinjer.length > 1) {
      const sorterade = [...kontextLinjer].sort((a, b) => a.pts[a.pts.length - 1].v - b.pts[b.pts.length - 1].v);
      for (const k of [sorterade[sorterade.length - 1], sorterade[0]]) {
        if (arPinnad(k.namn)) continue;
        const lp = k.pts[k.pts.length - 1];
        push(kort(k.namn), lp.v, C.extremLabel);
        g.append("circle")
          .attr("cx", xScale(lp.d)).attr("cy", yScale(lp.v))
          .attr("r", 2.4).attr("fill", C.extremLabel)
          .attr("stroke", "#fff").attr("stroke-width", 1.2);
      }
    }
    if (malniva != null) push("Mål", malniva, C.mal, 500);
    if (refPts && refPts.length > 1 && !harKontext) push("Föreg. år", refPts[refPts.length - 1].v, C.ref);

    const baseGap = compact ? 13 : 16;
    const gap = labels.length > 6 ? Math.max(12, baseGap - (labels.length - 6)) : baseGap;
    resolveOverlap(labels, gap, -6, plotH + 6);

    const x0 = plotW + CONN_GAP;
    for (const l of labels) {
      endLabelYs.push(l.yPos);
      g.append("path")
        .attr("d", `M${x0},${l.naturalY} H${x0 + CONN_MID} V${l.yPos} H${x0 + CONN_END}`)
        .attr("fill", "none").attr("stroke", C.conn).attr("stroke-width", 0.6);
      g.append("text")
        .attr("x", plotW + textX0).attr("y", l.yPos + l.size * 0.34)
        .attr("text-anchor", "start").attr("fill", l.color)
        .attr("font-size", `${l.size}px`).attr("font-weight", l.weight)
        .attr("font-family", FONT).text(l.text);
    }
  }

  // ── Källa — nere till vänster, i linje med y-etiketterna ──
  if (kalla && !bare) {
    // Kapa med ellips om raden inte ryms i grafens bredd
    let text = `Källa: ${kalla}`;
    const maxKallaW = width - mg.l - 8;
    while (text.length > 12 && measureText(text, `400 11px ${FONT}`) > maxKallaW) {
      text = text.replace(/…$/, "").slice(0, -1).trimEnd() + "…";
    }
    svg.append("text")
      .attr("x", mg.l).attr("y", height - 6)
      .attr("fill", C.kalla).attr("font-size", "11px")
      .attr("font-family", FONT).text(text);
  }

  // ════════════════════════════════════════
  //  Interaktion: crosshair, tooltip, hover på linjer, klick för att fästa
  // ════════════════════════════════════════

  const gridTop = yTicks.length > 0 ? yScale(yTicks[yTicks.length - 1]) : 0;
  const gridBottom = yTicks.length > 0 ? yScale(yTicks[0]) : plotH;

  const hoverLine = g.append("line")
    .attr("y1", gridTop).attr("y2", gridBottom)
    .attr("stroke", color).attr("stroke-width", 0.8)
    .attr("opacity", 0).attr("pointer-events", "none");

  const hoverDot = g.append("circle")
    .attr("r", compact ? 3.5 : 4.5)
    .attr("fill", color).attr("stroke", "#fff").attr("stroke-width", 2)
    .attr("opacity", 0).attr("pointer-events", "none");

  // Namnetikett vid linjeslutet för hovrad region (vit kant för läsbarhet)
  const hoverLabel = g.append("text")
    .attr("font-size", `${labelFs}px`).attr("font-weight", "500")
    .attr("font-family", FONT).attr("text-anchor", "start")
    .attr("paint-order", "stroke").attr("stroke", "#fff").attr("stroke-width", 3)
    .attr("opacity", 0).attr("pointer-events", "none");

  const tooltipNode = document.createElement("div");
  tooltipNode.style.cssText = "position:fixed;pointer-events:none;z-index:9999;display:none";
  tooltipNode.setAttribute("role", "tooltip");
  document.body.appendChild(tooltipNode);
  const tooltip = d3.select(tooltipNode);

  // Värde per tidpunkt för varje serie (exakt matchning på period)
  const valueMap = (arr: Pt[]) => new Map(arr.map((p) => [+p.d, p.v]));
  const mainMap = valueMap(pts);
  const kontextMaps = new Map(kontextLinjer.map((k) => [k.namn, valueMap(k.pts)]));
  const riketMap = riketPts ? valueMap(riketPts) : null;

  // Placering bland regionerna vid en tidpunkt (riktningsmedveten)
  function plats(namn: string | null, t: number): string | undefined {
    if (!harKontext) return undefined;
    const rader: { namn: string; v: number }[] = [];
    const hv = mainMap.get(t);
    if (hv != null) rader.push({ namn: huvudNamn, v: hv });
    for (const [n, m] of kontextMaps) {
      const v = m.get(t);
      if (v != null) rader.push({ namn: n, v });
    }
    if (rader.length < 2) return undefined;
    rader.sort((a, b) => inverterad ? a.v - b.v : b.v - a.v);
    const i = rader.findIndex((r) => r.namn === (namn ?? huvudNamn));
    return i >= 0 ? `${i + 1}/${rader.length}` : undefined;
  }

  const periodLabel = (pt: Pt) => pt.etikett && pt.period
    ? fullEtikett(pt.etikett, pt.period, vy)
    : pt.etikett
      ? (vy === "dag" || vy === "vecka" ? `${pt.etikett} ${pt.d.getFullYear()}` : pt.etikett)
      : `${d3.timeFormat("%-d %b")(pt.d)} ${pt.d.getFullYear()}`;

  function placeTooltip(px: number, py: number, html: string) {
    const rect = container.getBoundingClientRect();
    const screenX = rect.left + mg.l + px;
    const screenY = rect.top + mg.t + py;
    const flip = screenX + 240 > window.innerWidth;
    tooltip
      .style("display", null)
      .style("left", `${screenX}px`).style("top", `${screenY}px`)
      .style("transform", flip ? "translate(calc(-100% - 14px), -50%)" : "translate(14px, -50%)")
      .html(html);
  }

  // Tabellrader för en tidpunkt. `fokus` = hovrad region (lyfts fram).
  function tipRows(pt: Pt, fokus: KontextRef | null): TipRow[] {
    const t = +pt.d;
    const rows: TipRow[] = [];
    rows.push({ namn: huvudNamn, varde: pt.v, color, bold: true, plats: plats(null, t) });
    if (fokus && fokus.pinnbar) {
      rows.push({ namn: fokus.namn, varde: kontextMaps.get(fokus.namn)?.get(t) ?? null, color: fokus.color, bold: true, plats: plats(fokus.namn, t) });
    }
    for (const p of pinnade) {
      if (fokus && fokus.namn === p.namn) continue;
      rows.push({ namn: p.namn, varde: kontextMaps.get(p.namn)?.get(t) ?? null, color: p.color, plats: plats(p.namn, t) });
    }
    if (riketMap) rows.push({ namn: "Riket", varde: riketMap.get(t) ?? null, color: C.riket, dash: true, svag: true });
    if (band && band.length > 0) {
      const bm = band.find((b) => +b.d === t);
      if (bm) rows.push({ namn: "Förväntat", varde: bm.yhat, color: C.forvantat, dash: true, svag: true });
    }
    if (refPts && refPts.length > 1 && !harKontext) {
      const rv = refPts.find((p) => +p.d === t);
      if (rv) rows.push({ namn: "Föreg. år", varde: rv.v, color: C.ref, dash: true, svag: true });
    }
    // Ranking-grafer: sortera bäst → sämst (samma ordning som placeringen)
    if (harKontext) {
      const regioner = rows.filter((r) => !r.dash);
      const ovriga = rows.filter((r) => r.dash);
      regioner.sort((a, b) => {
        if (a.varde == null) return 1;
        if (b.varde == null) return -1;
        return inverterad ? a.varde - b.varde : b.varde - a.varde;
      });
      return [...regioner, ...ovriga];
    }
    return rows;
  }

  function statusFot(pt: Pt): string | undefined {
    if (!pt.signal) return undefined;
    const sc = SIGNAL_COLORS[pt.signal] || "#888";
    const sl = SIGNAL_LABELS[pt.signal] || "";
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:4px;padding-top:5px;border-top:1px solid #ececea">
      <span style="font-family:${FONT};font-size:10.5px;color:#8a8a86">Status</span>
      <span style="display:inline-flex;align-items:center;gap:5px">
        <span style="width:6px;height:6px;border-radius:50%;background:${sc}"></span>
        <span style="font-family:${FONT};font-size:10.5px;font-weight:600;color:${sc}">${sl}</span>
      </span></div>`;
  }

  // Tillgänglig sammanfattning för skärmläsare (role=img på overlay)
  const lp = pts[pts.length - 1];
  const ariaLabel = `${series.name ? series.name + ": " : ""}tidsserie med ${pts.length} punkter`
    + (lp ? `. Senaste ${fmtV(lp.v)}${lp.signal ? ", status " + (SIGNAL_LABELS[lp.signal] || "") : ""}` : "")
    + (harKontext ? ". Klicka på en regionlinje för att markera den" : "");

  let hovrad: KontextRef | null = null;

  function aterstall() {
    focusPath.attr("opacity", 0);
    focusEndDot.attr("opacity", 0);
    hoverLabel.attr("opacity", 0);
    hovrad = null;
  }

  // Huvudläge: Halland vid punkt idx — driver både mus och tangentbord
  function showAt(idx: number) {
    const pt = pts[idx];
    if (!pt) return;
    aterstall();
    const px = xScale(pt.d), py = yScale(pt.v);
    hoverLine.attr("x1", px).attr("x2", px).attr("opacity", compact ? 0.35 : 0.14);
    const hCol = pt.signal ? (SIGNAL_COLORS[pt.signal] || color) : color;
    hoverDot.attr("cx", px).attr("cy", py).attr("fill", hCol).attr("stroke", "#fff").attr("opacity", 1);
    placeTooltip(px, py, tipHtml(periodLabel(pt), tipRows(pt, null), fmtV, statusFot(pt)));
  }

  // Regionläge: en kontextlinje ligger närmast pekaren
  function showKontext(ref: KontextRef, idx: number) {
    const pt = pts[idx];
    if (!pt) return;
    const t = +pt.d;
    const rv = kontextMaps.get(ref.namn)?.get(t) ?? riketMap?.get(t) ?? null;
    hovrad = ref;
    // Lyft linjen: kopia ovanpå fältet (under Halland), i regionens färg
    focusPath.datum(ref.pts).attr("d", lineGen)
      .attr("stroke", ref.color).attr("stroke-width", ref.pinnad ? (compact ? 1.8 : 2.4) : (compact ? 1.3 : 1.8))
      .attr("stroke-dasharray", ref.pinnbar ? null : (compact ? "5,3" : "6,4"))
      .attr("opacity", 1);
    const lpk = ref.pts[ref.pts.length - 1];
    focusEndDot.attr("cx", xScale(lpk.d)).attr("cy", yScale(lpk.v)).attr("fill", ref.color).attr("opacity", 1);
    // Namn vid linjeslutet — men inte ovanpå en befintlig slutetikett
    // (namnet står ändå i tooltipen)
    const krock = endLabelYs.some((y) => Math.abs(y - ref.lastY) < labelFs + 2);
    if (!ref.pinnad && ref.pinnbar && !krock) {
      hoverLabel.attr("x", plotW + textX0).attr("y", ref.lastY + labelFs * 0.34)
        .attr("fill", ref.color).attr("opacity", 1).text(kort(ref.namn));
    } else {
      hoverLabel.attr("opacity", 0);
    }
    const px = xScale(pt.d);
    const py = rv != null ? yScale(rv) : yScale(pt.v);
    hoverLine.attr("x1", px).attr("x2", px).attr("opacity", compact ? 0.35 : 0.14);
    hoverDot.attr("cx", px).attr("cy", py).attr("fill", ref.color).attr("stroke", "#fff").attr("opacity", rv != null ? 1 : 0);
    const fot = ref.pinnbar
      ? `<div style="margin-top:5px;padding-top:4px;border-top:1px solid #ececea;font-family:${FONT};font-size:10px;color:#a3a3a0">${ref.pinnad ? "Klicka för att ta bort markeringen" : "Klicka för att markera regionen"}</div>`
      : undefined;
    placeTooltip(px, py, tipHtml(periodLabel(pt), tipRows(pt, ref), fmtV, fot));
  }

  function hide() {
    hoverLine.attr("opacity", 0);
    hoverDot.attr("opacity", 0);
    tooltip.style("display", "none");
    aterstall();
  }

  let curIdx = pts.length - 1;
  const TRAFF = compact ? 8 : 11; // px lodrätt avstånd för att "träffa" en linje

  g.append("rect")
    .attr("width", plotW).attr("height", plotH)
    .attr("fill", "transparent").attr("pointer-events", "all")
    .attr("tabindex", 0).attr("role", "img").attr("aria-label", ariaLabel)
    .style("cursor", "crosshair").style("outline", "none")
    .on("mousemove", (event) => {
      const [mx, my] = d3.pointer(event);
      const t = +xScale.invert(mx);
      curIdx = nearestIdx(pts, t);

      // Avstånd till varje linje där pekaren står (interpolerat), inte bara
      // vid närmaste datapunkt — ger hög precision även mellan punkterna.
      const mainY = yAtX(pts, t);
      const mainDist = mainY != null ? Math.abs(yScale(mainY) - my) : Infinity;
      let best: { ref: KontextRef; dist: number } | null = null;
      for (const ref of kontextRefs) {
        const yv = yAtX(ref.pts, t);
        if (yv == null) continue;
        const dist = Math.abs(yScale(yv) - my);
        if (!best || dist < best.dist) best = { ref, dist };
      }
      const target = event.currentTarget as SVGRectElement;
      if (best && best.dist <= TRAFF && best.dist < mainDist) {
        showKontext(best.ref, curIdx);
        target.style.cursor = best.ref.pinnbar && onTogglePin ? "pointer" : "crosshair";
      } else {
        showAt(curIdx);
        target.style.cursor = "crosshair";
      }
    })
    .on("mouseleave", hide)
    .on("click", () => {
      if (hovrad && hovrad.pinnbar && onTogglePin) onTogglePin(hovrad.namn);
    })
    .on("focus", () => showAt(curIdx))
    .on("blur", hide)
    .on("keydown", (event) => {
      if (event.key === "ArrowRight") { curIdx = Math.min(curIdx + 1, pts.length - 1); showAt(curIdx); event.preventDefault(); }
      else if (event.key === "ArrowLeft") { curIdx = Math.max(curIdx - 1, 0); showAt(curIdx); event.preventDefault(); }
      else if (event.key === "Home") { curIdx = 0; showAt(0); event.preventDefault(); }
      else if (event.key === "End") { curIdx = pts.length - 1; showAt(curIdx); event.preventDefault(); }
      else if (event.key === "Escape") { hide(); }
    });

  return () => { tooltipNode.remove(); };
}
