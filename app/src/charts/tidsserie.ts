import * as d3 from "d3";
import type { TidsseriePoint } from "../types";
import type { Pt, BandPt, ToppBandPt, TidsserieSeries, TidsserieOpts } from "./types";
import { SIGNAL_COLORS, SIGNAL_LABELS, FONT, FONT_MONO } from "./constants";
import { fmtVarde, fmtSuffix, fullEtikett } from "../utils/format";

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
  return raw.map((d) => ({ d: parse(d.period)!, v: d.varde })).filter((d) => d.d);
}

// ════════════════════════════════════════
//  Anti-collision (slutetiketter)
// ════════════════════════════════════════

interface EndLabel {
  text: string;
  naturalY: number;
  yPos: number;
  color: string;
  dash?: string;
}

function resolveOverlap(labels: EndLabel[], minGap: number, yMin: number, yMax: number) {
  labels.sort((a, b) => a.yPos - b.yPos);
  for (let iter = 0; iter < 20; iter++) {
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
    for (const l of labels) {
      l.yPos = Math.max(yMin + 6, Math.min(yMax - 6, l.yPos));
    }
    if (!moved) break;
  }
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
    width, height, margins: mg, enhet, vy,
    xDomain, yDomain, yTickCount,
    showTitle = false, titleText, titleColor,
    showEndLabels = false, mainLabel, showBrackets = false,
    compact = false, denseThreshold = 30,
    decimals, suffix: sfxOverride,
    tooltipAccentBorder = false,
    bare = false,
    singleBand = false,
  } = opts;

  const dec = decimals ?? (enhet === "procent" ? 1 : 0);
  const sfx = sfxOverride ?? fmtSuffix(enhet);
  const { pts, band, kontextLinjer: kontextRaw, riketPts: riketRaw, refPts: refRaw, toppBand: toppRaw, malniva, color } = series;

  if (pts.length < 2) return () => {};

  // Klipp jämförelseserierna (övriga regioner, riket, topp3-band, föreg. år) vid
  // höger axelkant = sista perioden med Halland-data. Regioner med nyare data
  // skulle annars ritas ut förbi x-axeln.
  const xMaxMs = +((xDomain ? xDomain[1] : d3.max(pts, (d) => d.d)) as Date);
  const inomX = <T extends { d: Date }>(p: T): boolean => +p.d <= xMaxMs;
  const kontextLinjer = kontextRaw?.map((k) => ({ namn: k.namn, pts: k.pts.filter(inomX) }));
  const riketPts = riketRaw?.filter(inomX);
  const refPts = refRaw?.filter(inomX);
  const toppBand = toppRaw?.filter(inomX);

  const dense = pts.length > denseThreshold;
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

  // ── Skalor ──
  const xScale = d3.scaleTime()
    .domain(xDomain || d3.extent(pts, (d) => d.d) as [Date, Date])
    .range([0, plotW]);

  const allVals = [
    ...pts.map((d) => d.v),
    ...(band || []).flatMap((b) => [b.lo, b.hi, b.yhat]),
    ...(kontextLinjer || []).flatMap((k) => k.pts.map((p) => p.v)),
    ...(riketPts || []).map((p) => p.v),
    ...(refPts || []).map((p) => p.v),
    ...(toppBand || []).flatMap((b) => [b.lo, b.hi]),
    ...(malniva != null ? [malniva] : []),
  ];
  const [yMin, yMax] = d3.extent(allVals) as [number, number];
  const span = yMax - yMin || 1;
  const yScale = d3.scaleLinear()
    .domain(yDomain ?? [yMin - span * 0.1, yMax + span * 0.1])
    .range([plotH, 0]).nice();

  // ── Gridlines — diskreta, stilfullt streckade (nollinjen hel) ──
  const yTicks = yScale.ticks(yTickCount ?? (compact ? 3 : 5));
  if (!bare) for (const t of yTicks) {
    const isZero = Math.abs(t) < 0.001;
    g.append("line")
      .attr("x1", 0).attr("x2", plotW)
      .attr("y1", yScale(t)).attr("y2", yScale(t))
      .attr("stroke", isZero ? "#c8c8c4" : "#dededa")
      .attr("stroke-width", isZero ? 1 : compact ? 0.5 : 0.6)
      .attr("stroke-dasharray", isZero ? "none" : "2,4");
  }

  // ── Y-axel ──
  const fontSize = compact ? "10px" : "12px";
  const yFmt = (v: number) => {
    if (enhet === "procent") return `${v.toFixed(0)}%`;
    if (enhet === "minuter") return v.toFixed(0);
    return v.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
  };

  // Dynamisk vänstermarginal: mät bredaste y-etiketten
  const maxLabelLen = Math.max(...yTicks.map((t) => yFmt(t).length));
  const autoLeftMg = Math.max(mg.l, maxLabelLen * (compact ? 6 : 7.5) + 8);
  // Korrigera plotbredd och g-position om marginalen behöver växa
  if (!bare && autoLeftMg > mg.l) {
    plotW = width - autoLeftMg - mg.r;
    g.attr("transform", `translate(${autoLeftMg},${mg.t})`);
    xScale.range([0, plotW]);
  }
  if (!bare) for (const t of yTicks) {
    g.append("text")
      .attr("x", -8).attr("y", yScale(t) + (compact ? 3.5 : 4))
      .attr("text-anchor", "end")
      .attr("fill", "#1a1a1a")
      .attr("font-size", fontSize).attr("font-weight", "400")
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
    g.append("line")
      .attr("x1", 0).attr("x2", plotW)
      .attr("y1", plotH).attr("y2", plotH)
      .attr("stroke", "#1a1a1a")
      .attr("stroke-width", compact ? 0.7 : 1.2);

    if (showBrackets) {
      g.append("line").attr("x1", 0).attr("x2", 0)
        .attr("y1", plotH - 4).attr("y2", plotH + 4)
        .attr("stroke", "#1a1a1a").attr("stroke-width", 1);
      g.append("line").attr("x1", plotW).attr("x2", plotW)
        .attr("y1", plotH - 4).attr("y2", plotH + 4)
        .attr("stroke", "#1a1a1a").attr("stroke-width", 1);
    }

    const xLabelFontSize = compact ? 10 : 12;
    const xLabelColor = "#1a1a1a";
    const xLabelYOffset = compact ? plotH + 14 : plotH + 18;

    // Datumetiketter: vid årsvy bara första och sista årtalet, centrerade rakt
    // under sina tickmarks. Vid finare upplösning jämnt fördelade i pixelrymden
    // och snäppta till närmaste datapunkt → överlappar därför ALDRIG.
    const axLabels = pts.map(fmtAxisLabel);
    const maxLabelW = Math.max(...axLabels.map((l) => l.length)) * xLabelFontSize * 0.6;
    const pad = Math.min(maxLabelW / 2, plotW / 2);
    let chosen: number[];
    if (vy === "ar") {
      chosen = pts.length > 1 ? [0, pts.length - 1] : [0];
    } else {
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
        .attr("x1", px).attr("x2", px).attr("y1", plotH).attr("y2", plotH + 3)
        .attr("stroke", "#1a1a1a").attr("stroke-width", compact ? 0.8 : 1);
      // Årtal centreras exakt under tickmarken; finare etiketter hålls innanför
      // plotkanten så de inte sticker ut.
      const labelX = vy === "ar" ? px : Math.max(pad, Math.min(plotW - pad, px));
      g.append("text")
        .attr("x", labelX).attr("y", xLabelYOffset)
        .attr("text-anchor", "middle").attr("fill", xLabelColor)
        .attr("font-size", `${xLabelFontSize}px`).attr("font-family", FONT)
        .text(axLabels[i]);
    }
  }

  // ── Kurvgenerator ──
  const lineGen = d3.line<Pt>()
    .x((d) => xScale(d.d)).y((d) => yScale(d.v))
    .curve(d3.curveMonotoneX);

  // ── Topp 3-band: zonen mellan bästa och tredje bästa region per år ──
  // Ritas först (bakom alla linjer) som ett följsamt grönt band.
  if (toppBand && toppBand.length > 1) {
    g.append("path").datum(toppBand)
      .attr("d", d3.area<ToppBandPt>()
        .x((b) => xScale(b.d)).y0((b) => yScale(b.lo)).y1((b) => yScale(b.hi))
        .curve(d3.curveMonotoneX))
      .attr("fill", "#00AB60")
      .attr("opacity", compact ? 0.09 : 0.12);
  }

  // ── Kontextlinjer (andra regioner — gråa streck, identifierbara via hover) ──
  // Balans: mjukare än Riket men fortfarande synliga.
  type KontextRef = {
    namn: string;
    pts: Pt[];
    path: d3.Selection<SVGPathElement, Pt[], null, undefined>;
    base: { stroke: string; width: number; opacity: number; dash: string | null };
  };
  const kontextRefs: KontextRef[] = [];
  const kontextBas = {
    stroke: compact ? "#d3d3cf" : "#cfcfcb",
    width: compact ? 0.7 : 0.85,
    opacity: 0.65,
    dash: null as string | null,
  };
  if (kontextLinjer) {
    for (const kl of kontextLinjer) {
      if (kl.pts.length < 2) continue;
      const path = g.append("path").datum(kl.pts)
        .attr("d", lineGen)
        .attr("fill", "none").attr("stroke", kontextBas.stroke)
        .attr("stroke-width", kontextBas.width).attr("opacity", kontextBas.opacity);
      kontextRefs.push({ namn: kl.namn, pts: kl.pts, path, base: { ...kontextBas } });
    }
  }

  // ── Riket-linje (streckad, markant mörk) — etikett via slutetiketter ──
  if (riketPts && riketPts.length > 1) {
    const riketStil = {
      stroke: compact ? "#55554f" : "#3f3f3a",
      width: compact ? 1.6 : 2.2,
      opacity: 0.85,
      dash: compact ? "5,3" : "6,4",
    };
    const riketPath = g.append("path").datum(riketPts)
      .attr("d", lineGen)
      .attr("fill", "none").attr("stroke", riketStil.stroke)
      .attr("stroke-width", riketStil.width)
      .attr("stroke-dasharray", riketStil.dash)
      .attr("opacity", riketStil.opacity);
    // Riket ingår i hover-identifieringen men behåller sin stil
    kontextRefs.push({ namn: "Riket", pts: riketPts, path: riketPath, base: riketStil });
  }

  // ── Målnivå (horisontell referenslinje) — etikett via slutetiketter ──
  if (malniva != null) {
    const my = yScale(malniva);
    g.append("line")
      .attr("x1", 0).attr("x2", plotW).attr("y1", my).attr("y2", my)
      .attr("stroke", "#4b5563").attr("stroke-width", compact ? 1 : 1.2)
      .attr("stroke-dasharray", "2,3").attr("opacity", 0.75);
    if (!compact && !showEndLabels) {
      g.append("text")
        .attr("x", plotW - 2).attr("y", my - 4)
        .attr("text-anchor", "end").attr("fill", "#4b5563")
        .attr("font-size", "10px").attr("font-family", FONT)
        .attr("font-weight", "500").text("Mål");
    }
  }

  // ── Referenslinje (föregående år — bara om inga kontextserier) ──
  if (refPts && refPts.length > 1 && !kontextLinjer) {
    g.append("path").datum(refPts)
      .attr("d", lineGen)
      .attr("fill", "none").attr("stroke", compact ? "#bbb" : "#aaa")
      .attr("stroke-width", compact ? 1.2 : 1.2)
      .attr("stroke-dasharray", compact ? "4,3" : "6,4")
      .attr("opacity", compact ? 0.6 : 0.5);
  }

  // ── Prediktionsband (95 % yttre, 80 % inre) ──
  if (band && band.length > 0) {
    // 95 %-band
    g.append("path").datum(band)
      .attr("d", d3.area<BandPt>()
        .x((d) => xScale(d.d)).y0((d) => yScale(d.lo)).y1((d) => yScale(d.hi))
        .curve(d3.curveMonotoneX))
      .attr("fill", "#9aa5b1")
      .attr("opacity", compact ? 0.08 : singleBand ? 0.14 : (dense ? 0.08 : 0.10));

    // 80 %-band (inre) — hoppas över i singleBand-läge (storgrafen)
    const band80 = singleBand ? [] : band.filter((b) => b.lo80 != null);
    if (band80.length > 0) {
      g.append("path").datum(band80)
        .attr("d", d3.area<BandPt>()
          .x((d) => xScale(d.d)).y0((d) => yScale(d.lo80!)).y1((d) => yScale(d.hi80!))
          .curve(d3.curveMonotoneX))
        .attr("fill", "#9aa5b1")
        .attr("opacity", compact ? 0.14 : (dense ? 0.16 : 0.20));
    }

    // Prediktionslinje (streckad)
    g.append("path").datum(band)
      .attr("d", d3.line<BandPt>()
        .x((d) => xScale(d.d)).y((d) => yScale(d.yhat))
        .curve(d3.curveMonotoneX))
      .attr("fill", "none").attr("stroke", "#333")
      .attr("stroke-width", compact ? 0.8 : (dense ? 1.0 : 1.3))
      .attr("stroke-dasharray", compact ? "3,3" : "5,4")
      .attr("opacity", compact ? 0.35 : 0.45);
  }

  // ── Faktisk linje ──
  const lineWidth = compact
    ? (dense ? 1.0 : 1.8)
    : (dense ? 1.3 : 2.5);
  g.append("path").datum(pts)
    .attr("d", lineGen)
    .attr("fill", "none").attr("stroke", color)
    .attr("stroke-width", lineWidth)
    .attr("stroke-linejoin", "round").attr("stroke-linecap", "round");

  // ── Datapunkter (bara vid få datapunkter) — neutral färg ──
  if (!dense && !compact) {
    g.selectAll(".dot").data(pts).join("circle")
      .attr("cx", (d) => xScale(d.d)).attr("cy", (d) => yScale(d.v))
      .attr("r", 3)
      .attr("fill", color)
      .attr("stroke", "#fff").attr("stroke-width", 1.5);
  }

  // ── Senaste punkt — "live"-indikator: ring i samma storlek som
  //    säsongsmarkörerna + en smakfull pulsande ping. ──
  const last = pts[pts.length - 1];
  if (last) {
    const lastCol = series.lastColor ?? color;
    const cx = xScale(last.d), cy = yScale(last.v);

    // Statisk halo (samma storlek som säsongsmarkörerna)
    g.append("circle").attr("cx", cx).attr("cy", cy)
      .attr("r", compact ? 5 : 7).attr("fill", lastCol).attr("opacity", 0.14);

    // Pulsande ping — även i de små facet-panelerna (mindre där)
    if (!bare) {
      g.append("circle").attr("class", "pulse-ping").attr("cx", cx).attr("cy", cy)
        .attr("r", compact ? 4 : 6).attr("fill", lastCol);
    }

    // Fylld mittprick
    const r = compact ? (dense ? 2.8 : 3.5) : 4;
    g.append("circle").attr("cx", cx).attr("cy", cy)
      .attr("r", r).attr("fill", lastCol)
      .attr("stroke", "#fff").attr("stroke-width", compact ? (dense ? 1.5 : 2) : 2);
  }

  // ── Säsongsmarkörer: samma kalenderslot som rapportperioden, framhävt ──
  // (Den aktuella perioden = sista punkten behåller sin fyllda prick ovan.)
  if (!bare && last) {
    const match = comparableMatcher(vy, last.d);
    if (match) {
      for (const p of pts) {
        if (p === last || !match(p.d)) continue;
        const cx = xScale(p.d), cy = yScale(p.v);
        const c = color;
        g.append("circle").attr("cx", cx).attr("cy", cy)
          .attr("r", compact ? 5 : 7).attr("fill", c).attr("opacity", 0.12);
        g.append("circle").attr("cx", cx).attr("cy", cy)
          .attr("r", compact ? 2.8 : 3.8).attr("fill", "#fff")
          .attr("stroke", c).attr("stroke-width", compact ? 1.3 : 1.8);
      }
    }
  }

  // ── Slutetiketter (ChartModal-stil) ──
  if (showEndLabels) {
    const labels: EndLabel[] = [];
    labels.push({
      text: mainLabel || "Faktiskt", naturalY: yScale(lastPt.v),
      yPos: yScale(lastPt.v), color,
    });
    if (band && band.length > 0) {
      const lastBand = band[band.length - 1];
      if (lastBand) {
        labels.push({
          text: "Förväntat", naturalY: yScale(lastBand.yhat),
          yPos: yScale(lastBand.yhat), color: "#555", dash: "5,4",
        });
      }
    }
    if (riketPts && riketPts.length > 0) {
      const lastRiket = riketPts[riketPts.length - 1];
      labels.push({
        text: "Riket", naturalY: yScale(lastRiket.v),
        yPos: yScale(lastRiket.v), color: "#3f3f3a", dash: "6,4",
      });
    }
    // Högsta och lägsta region bland kontextlinjerna etiketteras (senaste värdet)
    if (kontextLinjer && kontextLinjer.length > 1) {
      const medData = kontextLinjer.filter((k) => k.pts.length > 0);
      if (medData.length > 1) {
        const sorterade = [...medData].sort(
          (a, b) => a.pts[a.pts.length - 1].v - b.pts[b.pts.length - 1].v,
        );
        for (const k of [sorterade[sorterade.length - 1], sorterade[0]]) {
          const lp = k.pts[k.pts.length - 1];
          const text = k.namn.length > 18 ? k.namn.slice(0, 17) + "…" : k.namn;
          labels.push({
            text, naturalY: yScale(lp.v), yPos: yScale(lp.v), color: "#8a8a86",
          });
        }
      }
    }
    if (malniva != null) {
      labels.push({
        text: "Mål", naturalY: yScale(malniva),
        yPos: yScale(malniva), color: "#4b5563", dash: "2,3",
      });
    }
    if (refPts && refPts.length > 1) {
      const lastRef = refPts[refPts.length - 1];
      labels.push({
        text: "Föreg. år", naturalY: yScale(lastRef.v),
        yPos: yScale(lastRef.v), color: "#aaa", dash: "6,4",
      });
    }

    resolveOverlap(labels, 16, 0, plotH);
    const connX = plotW;

    for (const l of labels) {
      if (Math.abs(l.yPos - l.naturalY) > 2) {
        g.append("path")
          .attr("d", `M${connX},${l.naturalY} L${connX + 5},${l.naturalY} L${connX + 5},${l.yPos} L${connX + 10},${l.yPos}`)
          .attr("fill", "none").attr("stroke", l.color).attr("stroke-width", 0.8).attr("opacity", 0.5);
      }
      g.append("circle")
        .attr("cx", connX).attr("cy", l.naturalY)
        .attr("r", 3).attr("fill", l.color).attr("stroke", "#fff").attr("stroke-width", 1.5);
      g.append("text")
        .attr("x", connX + 12).attr("y", l.yPos + 3.5)
        .attr("text-anchor", "start").attr("fill", l.color)
        .attr("font-size", "11px").attr("font-weight", "500")
        .attr("font-family", FONT).text(l.text);
    }
  }

  // ── Crosshair + tooltip ──
  const gridTop = yTicks.length > 0 ? yScale(yTicks[yTicks.length - 1]) : 0;
  const gridBottom = yTicks.length > 0 ? yScale(yTicks[0]) : plotH;

  const hoverLine = g.append("line")
    .attr("y1", gridTop).attr("y2", gridBottom)
    .attr("stroke", compact ? "#ccc" : color)
    .attr("stroke-width", compact ? 0.7 : 0.8)
    .attr("stroke-dasharray", compact ? "3,3" : "none")
    .attr("opacity", 0).attr("pointer-events", "none");

  const hoverDot = g.append("circle")
    .attr("r", compact ? 3.5 : 4.5)
    .attr("fill", compact ? "#fff" : color)
    .attr("stroke", compact ? color : "#fff")
    .attr("stroke-width", compact ? 1.5 : 2)
    .attr("opacity", 0).attr("pointer-events", "none");

  const tooltipNode = document.createElement("div");
  tooltipNode.style.cssText = "position:fixed;pointer-events:none;z-index:9999;display:none";
  document.body.appendChild(tooltipNode);
  const tooltip = d3.select(tooltipNode);

  const bisect = d3.bisector<Pt, Date>((d) => d.d).left;

  // Tillgänglig sammanfattning för skärmläsare (role=img på overlay)
  const lp = pts[pts.length - 1];
  const ariaLabel = `${series.name ? series.name + ": " : ""}tidsserie med ${pts.length} punkter`
    + (lp ? `. Senaste ${fmtVarde(lp.v, enhet, dec)}${sfx}${lp.signal ? ", status " + (SIGNAL_LABELS[lp.signal] || "") : ""}` : "");

  // Visa hover/fokus på punkt idx — driver både mus och tangentbord
  function showAt(idx: number) {
    const pt = pts[idx];
    if (!pt) return;

      hoverLine.attr("x1", xScale(pt.d)).attr("x2", xScale(pt.d))
        .attr("opacity", compact ? 1 : 0.15);
      const hCol = pt.signal ? (SIGNAL_COLORS[pt.signal] || color) : color;
      hoverDot.attr("cx", xScale(pt.d)).attr("cy", yScale(pt.v))
        .attr("stroke", compact ? hCol : "#fff")
        .attr("fill", compact ? "#fff" : hCol)
        .attr("opacity", 1);

      const label = pt.etikett && pt.period
        ? fullEtikett(pt.etikett, pt.period, vy)
        : pt.etikett
          ? (vy === "dag" || vy === "vecka" ? `${pt.etikett} ${pt.d.getFullYear()}` : pt.etikett)
          : `${d3.timeFormat("%-d %b")(pt.d)} ${pt.d.getFullYear()}`;
      const fv = fmtVarde(pt.v, enhet, dec) + sfx;

      const sigColor = pt.signal ? (SIGNAL_COLORS[pt.signal] || "#00664D") : "#00664D";

      let rows = `<div style="font-family:${FONT};font-size:11px;font-weight:${tooltipAccentBorder ? 600 : 500};color:${tooltipAccentBorder ? "#00664D" : "#555"};
                    margin-bottom:5px;padding-bottom:4px;border-bottom:1px solid #f0f0ee">${label}</div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:14px;margin-bottom:3px">
          <span style="font-family:${FONT};font-size:10.5px;color:#888">Faktiskt</span>
          <span style="font-family:${FONT_MONO};font-size:11.5px;font-weight:600;color:#0a0a0a;font-feature-settings:'tnum'">${fv}</span>
        </div>`;

      // Förväntat — hitta matchande bandpunkt
      if (band && band.length > 0) {
        const bandMatch = band.find((b) => +b.d === +pt.d);
        if (bandMatch) {
          rows += `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:14px;margin-bottom:3px">
            <span style="font-family:${FONT};font-size:10.5px;color:#888">Förväntat</span>
            <span style="font-family:${FONT_MONO};font-size:11.5px;font-weight:500;color:#777;font-feature-settings:'tnum'">${fmtVarde(bandMatch.yhat, enhet, dec)}${sfx}</span>
          </div>`;
        }
      }

      // Status
      if (pt.signal) {
        const sc = SIGNAL_COLORS[pt.signal] || "#888";
        const sl = SIGNAL_LABELS[pt.signal] || "";
        rows += `<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:1px;padding-top:4px;border-top:1px solid #f0f0ee">
          <span style="font-family:${FONT};font-size:10.5px;color:#888">Status</span>
          <span style="display:inline-flex;align-items:center;gap:4px">
            <span style="width:5px;height:5px;border-radius:50%;background:${sc}"></span>
            <span style="font-family:${FONT};font-size:10.5px;font-weight:600;color:${sc}">${sl}</span>
          </span>
        </div>`;
      }

      const borderStyle = tooltipAccentBorder
        ? `border:1px solid #e0e0dc;border-left:3px solid ${sigColor}`
        : "border:1px solid #e0e0dc";

      const rect = container.getBoundingClientRect();
      const screenX = rect.left + mg.l + xScale(pt.d);
      const screenY = rect.top + mg.t + yScale(pt.v);
      const flip = screenX + 160 > window.innerWidth;

      tooltip
        .style("display", null)
        .style("left", `${screenX}px`)
        .style("top", `${screenY - (tooltipAccentBorder ? 10 : 0)}px`)
        .style("transform", tooltipAccentBorder
          ? "translate(-50%, -100%)"
          : (flip ? "translate(-110%, -50%)" : "translate(10px, -50%)"))
        .html(`<div style="background:#fff;${borderStyle};border-radius:${tooltipAccentBorder ? 4 : 7}px;
                   padding:${tooltipAccentBorder ? "8px 12px" : "7px 12px"};
                   box-shadow:0 ${tooltipAccentBorder ? "4px 20px" : "3px 12px"} rgba(0,0,0,${tooltipAccentBorder ? "0.07" : "0.10"});
                   white-space:nowrap;min-width:120px">${rows}</div>`);
  }

  // ── Kontext-hover: identifiera närmaste regionlinje under muspekaren ──
  const bisectPt = d3.bisector<Pt, Date>((d) => d.d).left;

  function aterstallKontext() {
    for (const k of kontextRefs) {
      k.path.attr("stroke", k.base.stroke).attr("stroke-width", k.base.width)
        .attr("opacity", k.base.opacity).attr("stroke-dasharray", k.base.dash);
    }
  }

  function narmsteKontext(mx: number, my: number) {
    const dato = xScale.invert(mx);
    let best: { ref: KontextRef; pt: Pt; dist: number } | null = null;
    for (const k of kontextRefs) {
      let i = Math.min(bisectPt(k.pts, dato), k.pts.length - 1);
      if (i > 0 && Math.abs(+k.pts[i - 1].d - +dato) < Math.abs(+k.pts[i].d - +dato)) i--;
      const pt = k.pts[i];
      if (!pt) continue;
      const dist = Math.abs(yScale(pt.v) - my);
      if (!best || dist < best.dist) best = { ref: k, pt, dist };
    }
    return best;
  }

  function visaKontext(ref: KontextRef, pt: Pt) {
    aterstallKontext();
    ref.path.attr("stroke", "#6f6f6b").attr("stroke-width", ref.base.width + 0.8).attr("opacity", 1);
    hoverLine.attr("opacity", 0);
    hoverDot.attr("cx", xScale(pt.d)).attr("cy", yScale(pt.v))
      .attr("fill", "#fff").attr("stroke", "#6f6f6b").attr("opacity", 1);

    const etikett = pt.etikett ?? String(pt.d.getFullYear());
    const rect = container.getBoundingClientRect();
    const screenX = rect.left + mg.l + xScale(pt.d);
    const screenY = rect.top + mg.t + yScale(pt.v);
    const flip = screenX + 160 > window.innerWidth;
    tooltip
      .style("display", null)
      .style("left", `${screenX}px`).style("top", `${screenY}px`)
      .style("transform", flip ? "translate(-110%, -50%)" : "translate(10px, -50%)")
      .html(`<div style="background:#fff;border:1px solid #e0e0dc;border-left:3px solid #6f6f6b;border-radius:7px;
                 padding:7px 12px;box-shadow:0 3px 12px rgba(0,0,0,0.10);white-space:nowrap">
        <div style="font-family:${FONT};font-size:11.5px;font-weight:600;color:#1a1a1a;margin-bottom:2px">${ref.namn}</div>
        <div style="display:flex;justify-content:space-between;gap:14px;align-items:baseline">
          <span style="font-family:${FONT};font-size:10.5px;color:#888">${etikett}</span>
          <span style="font-family:${FONT_MONO};font-size:11.5px;font-weight:600;color:#0a0a0a;font-feature-settings:'tnum'">${fmtVarde(pt.v, enhet, dec)}${sfx}</span>
        </div>
      </div>`);
  }

  function hide() {
    hoverLine.attr("opacity", 0);
    hoverDot.attr("opacity", 0);
    tooltip.style("display", "none");
    aterstallKontext();
  }

  let curIdx = pts.length - 1;
  g.append("rect")
    .attr("width", plotW).attr("height", plotH)
    .attr("fill", "transparent").attr("pointer-events", "all")
    .attr("tabindex", 0).attr("role", "img").attr("aria-label", ariaLabel)
    .style("cursor", "crosshair").style("outline", "none")
    .on("mousemove", (event) => {
      const [mx, my] = d3.pointer(event);
      curIdx = Math.min(bisect(pts, xScale.invert(mx)), pts.length - 1);
      // Närmare en regionlinje än huvudlinjen? → visa regionens namn/värde
      const mainPt = pts[curIdx];
      const mainDist = mainPt ? Math.abs(yScale(mainPt.v) - my) : Infinity;
      const kandidat = kontextRefs.length > 0 ? narmsteKontext(mx, my) : null;
      if (kandidat && kandidat.dist < 9 && kandidat.dist < mainDist - 2) {
        visaKontext(kandidat.ref, kandidat.pt);
      } else {
        aterstallKontext();
        showAt(curIdx);
      }
    })
    .on("mouseleave", hide)
    .on("focus", () => showAt(curIdx))
    .on("blur", hide)
    .on("keydown", (event) => {
      if (event.key === "ArrowRight") { curIdx = Math.min(curIdx + 1, pts.length - 1); showAt(curIdx); event.preventDefault(); }
      else if (event.key === "ArrowLeft") { curIdx = Math.max(curIdx - 1, 0); showAt(curIdx); event.preventDefault(); }
      else if (event.key === "Home") { curIdx = 0; showAt(0); event.preventDefault(); }
      else if (event.key === "End") { curIdx = pts.length - 1; showAt(curIdx); event.preventDefault(); }
      else if (event.key === "Escape") { hide(); }
    });

  tooltipNode.setAttribute("role", "tooltip");
  return () => { tooltipNode.remove(); };
}
