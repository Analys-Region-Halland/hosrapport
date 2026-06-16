import { useEffect, useRef, useId } from "react";
import * as d3 from "d3";
import type { TidsseriePoint } from "../types";
import { parseTidsserie } from "../charts/tidsserie";
import { SIGNAL_COLORS } from "../charts/constants";
import type { Pt } from "../charts/types";

// ════════════════════════════════════════════════════════════
//  MiniTrend — krispig sparkline för heatmapens hover-ruta.
//
//  Läsbarhet: y-skalan baseras på FAKTISKA värden (inte bandets
//  ytterkanter — det plattar ut linjen). Bandet ritas men klipps
//  till plotytan. Punktmarkörer vid få punkter gör skiften tydliga;
//  hovrad period markeras; föregående år ritas streckat när det finns.
// ════════════════════════════════════════════════════════════

interface Props {
  serie: TidsseriePoint[];
  refSerie?: TidsseriePoint[];
  accent: string;
  highlightPeriod?: string;
  width?: number;
  height?: number;
}

export default function MiniTrend({ serie, refSerie, accent, highlightPeriod, width = 224, height = 94 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[:]/g, "");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";

    const { pts, band } = parseTidsserie(serie);
    if (pts.length < 2) return;
    const refPts: Pt[] = refSerie ? parseTidsserie(refSerie).pts : [];

    const mg = { t: 10, r: 10, b: 12, l: 10 };
    const w = width - mg.l - mg.r;
    const h = height - mg.t - mg.b;

    const svg = d3.select(el).append("svg")
      .attr("width", width).attr("height", height).style("display", "block");

    const defs = svg.append("defs");
    const gradId = `mt-grad-${uid}`;
    const clipId = `mt-clip-${uid}`;
    const grad = defs.append("linearGradient")
      .attr("id", gradId).attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");
    grad.append("stop").attr("offset", "0%").attr("stop-color", accent).attr("stop-opacity", 0.20);
    grad.append("stop").attr("offset", "100%").attr("stop-color", accent).attr("stop-opacity", 0);
    defs.append("clipPath").attr("id", clipId).append("rect").attr("width", w).attr("height", h);

    const g = svg.append("g").attr("transform", `translate(${mg.l},${mg.t})`);

    const x = d3.scaleTime().domain(d3.extent(pts, (d) => d.d) as [Date, Date]).range([0, w]);

    // ── y-skala från VÄRDEN (+ ev. föreg. år) — INTE bandets ytterkanter ──
    const vvals = [...pts.map((d) => d.v), ...refPts.map((d) => d.v)];
    const [mn, mx] = d3.extent(vvals) as [number, number];
    const pad = (mx - mn) * 0.14 || Math.max(Math.abs(mx) * 0.08, 1);
    const y = d3.scaleLinear().domain([mn - pad, mx + pad]).range([h, 0]);

    const clipped = g.append("g").attr("clip-path", `url(#${clipId})`);

    // Prediktionsband (klippt, mycket diskret)
    if (band && band.length > 1) {
      clipped.append("path").datum(band)
        .attr("d", d3.area<typeof band[number]>()
          .x((d) => x(d.d)).y0((d) => y(d.lo)).y1((d) => y(d.hi))
          .curve(d3.curveMonotoneX))
        .attr("fill", "#9aa5b1").attr("opacity", 0.12);
    }

    // Föregående år (streckad grå)
    if (refPts.length > 1) {
      clipped.append("path").datum(refPts)
        .attr("d", d3.line<Pt>().x((d) => x(d.d)).y((d) => y(d.v)).curve(d3.curveMonotoneX))
        .attr("fill", "none").attr("stroke", "#b3b3b3")
        .attr("stroke-width", 1.4).attr("stroke-dasharray", "4,3").attr("opacity", 0.85);
    }

    // Area under huvudkurvan
    clipped.append("path").datum(pts)
      .attr("d", d3.area<Pt>().x((d) => x(d.d)).y0(h).y1((d) => y(d.v)).curve(d3.curveMonotoneX))
      .attr("fill", `url(#${gradId})`);

    // Huvudkurvan
    clipped.append("path").datum(pts)
      .attr("d", d3.line<Pt>().x((d) => x(d.d)).y((d) => y(d.v)).curve(d3.curveMonotoneX))
      .attr("fill", "none").attr("stroke", accent)
      .attr("stroke-width", 2).attr("stroke-linejoin", "round").attr("stroke-linecap", "round");

    // Punktmarkörer vid få punkter → skiften syns
    if (pts.length <= 18) {
      g.selectAll(".mt-dot").data(pts).join("circle")
        .attr("cx", (d) => x(d.d)).attr("cy", (d) => y(d.v)).attr("r", 1.9)
        .attr("fill", accent).attr("stroke", "#fff").attr("stroke-width", 0.8);
    }

    // Markerad punkt (hovrad period, annars sista)
    const hl = (highlightPeriod && pts.find((p) => p.period === highlightPeriod)) || pts[pts.length - 1];
    if (hl) {
      const hx = x(hl.d), hy = y(hl.v);
      const hc = hl.signal ? (SIGNAL_COLORS[hl.signal] || accent) : accent;
      g.append("line").attr("x1", hx).attr("x2", hx).attr("y1", hy + 4).attr("y2", h)
        .attr("stroke", hc).attr("stroke-width", 1).attr("stroke-dasharray", "2,2").attr("opacity", 0.4);
      g.append("circle").attr("cx", hx).attr("cy", hy).attr("r", 4.5)
        .attr("fill", hc).attr("stroke", "#fff").attr("stroke-width", 2);
    }
  }, [serie, refSerie, accent, highlightPeriod, width, height, uid]);

  return <div ref={ref} style={{ width }} />;
}
