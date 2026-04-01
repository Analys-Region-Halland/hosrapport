import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import type { KpiData, VyData } from "../types";
import { fmtVarde, fmtSuffix, fullEtikett } from "../utils/format";

const SIGNAL_COLORS: Record<string, string> = { gron: "#16a34a", gul: "#ea980c", rod: "#dc2626" };

const FONT_TITEL = "'Source Serif 4', Georgia, serif";
const FONT = "'IBM Plex Sans', system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

// ── Anti-collision (kommundata-metoden) ──
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

interface Props {
  kpi: KpiData;
  vyData: VyData;
  visaDagar?: boolean;
  onClose: () => void;
}

export default function ChartModal({ kpi, vyData, visaDagar: initialVisaDagar, onClose }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const harDagar = vyData.vy !== "dag" && kpi.dagar && kpi.dagar.length > 0;
  const [visaDagar, setVisaDagar] = useState(!!initialVisaDagar);

  const aktivVyId = visaDagar && harDagar ? "dag" : vyData.vy;
  const aktivData = visaDagar && harDagar ? kpi.dagar! : kpi.tidsserie;

  const accent = SIGNAL_COLORS[kpi.status] || "#525252";
  const dec = kpi.enhet === "procent" ? 1 : 0;
  const suffix = fmtSuffix(kpi.enhet);

  // ── Titel: KPI-namn (inkl avdelning om det finns i namnet) ──
  const titel = kpi.namn;

  // ── Undertitel ──
  const undertitel = useMemo(() => {
    if (visaDagar && vyData.dagar_period) {
      return `Daglig, ${vyData.dagar_period.etikett} · Region Halland`;
    }
    return `${vyData.etikett} · ${vyData.period} · Region Halland`;
  }, [vyData, visaDagar]);

  useEffect(() => {
    const kh = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", kh);
    return () => document.removeEventListener("keydown", kh);
  }, [onClose]);

  const measRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      const h = width < 500 ? Math.min(window.innerHeight * 0.5, 400) : Math.round(width * 0.55);
      setDims({ w: width, h });
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => { tooltipRef.current?.remove(); };
  }, []);

  // ── Rita D3-graf ──
  useEffect(() => {
    if (!chartRef.current || dims.w === 0 || aktivData.length < 2) return;
    const container = chartRef.current;
    container.innerHTML = "";
    tooltipRef.current?.remove();

    const parse = d3.timeParse("%Y-%m-%d");
    const pts = aktivData.map((d) => ({
      d: parse(d.period)!, v: d.varde, etikett: d.etikett, period: d.period,
      yhat: d.yhat, lo: d.yhat_lower, hi: d.yhat_upper,
      lo80: d.yhat_lower_80, hi80: d.yhat_upper_80, signal: d.signal,
    })).filter((d) => d.d);

    const hasBand = pts.some((p) => p.yhat != null);
    const { w, h } = dims;
    const mg = { t: 12, r: 100, b: 36, l: 52 };

    const svg = d3.select(container).append("svg")
      .attr("width", w).attr("height", h).style("display", "block");

    const x = d3.scaleTime()
      .domain(d3.extent(pts, (d) => d.d) as [Date, Date])
      .range([mg.l, w - mg.r]);

    // Referenslinje (föregående år)
    const hasRef = kpi.referens_serie && kpi.referens_serie.length > 0;
    const refPts = hasRef
      ? kpi.referens_serie!.map((d, i) => ({
          d: pts[Math.min(i, pts.length - 1)]?.d,
          v: d.varde,
        })).filter((d) => d.d)
      : [];

    const allVals = pts.flatMap((d) => [d.v, d.lo, d.hi].filter((v): v is number => v != null));
    if (hasBand) allVals.push(...pts.filter((p) => p.yhat != null).map((p) => p.yhat!));
    if (refPts.length > 0) allVals.push(...refPts.map((d) => d.v));
    const ext = d3.extent(allVals) as [number, number];
    const pad = (ext[1] - ext[0]) * 0.12 || 1;
    const y = d3.scaleLinear()
      .domain([ext[0] - pad, ext[1] + pad])
      .range([h - mg.b, mg.t]).nice();

    // Grid
    const yTicks = y.ticks(5);
    svg.selectAll(".grid").data(yTicks).join("line")
      .attr("x1", mg.l).attr("x2", w - mg.r)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#e8e8e8").attr("stroke-width", 0.5);

    // Y-axel
    svg.append("g").attr("transform", `translate(${mg.l},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(8)
        .tickFormat((d) => {
          const v = d as number;
          if (kpi.enhet === "procent") return v.toFixed(0) + "%";
          return v.toLocaleString("sv-SE");
        }))
      .call((g) => g.select(".domain").remove())
      .selectAll("text").attr("fill", "#888").attr("font-size", "11px")
      .attr("font-family", FONT).style("font-feature-settings", "'tnum'");

    // X-axel
    const firstPt = pts[0];
    const lastPt = pts[pts.length - 1];

    svg.append("line")
      .attr("x1", mg.l).attr("x2", w - mg.r)
      .attr("y1", h - mg.b).attr("y2", h - mg.b)
      .attr("stroke", "#e8e8e8").attr("stroke-width", 0.5);

    svg.append("text")
      .attr("x", mg.l).attr("y", h - mg.b + 16)
      .attr("text-anchor", "start")
      .attr("fill", "#888").attr("font-size", "11px").attr("font-family", FONT)
      .text(fullEtikett(firstPt.etikett, firstPt.period, aktivVyId));

    svg.append("text")
      .attr("x", w - mg.r).attr("y", h - mg.b + 16)
      .attr("text-anchor", "end")
      .attr("fill", "#888").attr("font-size", "11px").attr("font-family", FONT)
      .text(fullEtikett(lastPt.etikett, lastPt.period, aktivVyId));

    const dense = pts.length > 30;

    // Referenslinje (föregående år)
    if (refPts.length > 1) {
      svg.append("path").datum(refPts)
        .attr("d", d3.line<typeof refPts[0]>()
          .x((d) => x(d.d)).y((d) => y(d.v)).curve(d3.curveMonotoneX))
        .attr("fill", "none").attr("stroke", "#aaa")
        .attr("stroke-width", 1.2).attr("stroke-dasharray", "6,4")
        .attr("opacity", 0.5);
    }

    // Prediktionsband (95 % yttre, 80 % inre)
    if (hasBand) {
      // 95 %-band (yttre, ljusare)
      svg.append("path").datum(pts.filter((p) => p.lo != null))
        .attr("d", d3.area<typeof pts[0]>()
          .x((d) => x(d.d)).y0((d) => y(d.lo!)).y1((d) => y(d.hi!))
          .curve(d3.curveMonotoneX))
        .attr("fill", "#C1E8C4").attr("opacity", dense ? 0.12 : 0.18);

      // 80 %-band (inre, mörkare)
      const pts80 = pts.filter((p) => p.lo80 != null);
      if (pts80.length > 0) {
        svg.append("path").datum(pts80)
          .attr("d", d3.area<typeof pts[0]>()
            .x((d) => x(d.d)).y0((d) => y(d.lo80!)).y1((d) => y(d.hi80!))
            .curve(d3.curveMonotoneX))
          .attr("fill", "#C1E8C4").attr("opacity", dense ? 0.22 : 0.32);
      }

      // Förväntat-linje
      svg.append("path").datum(pts.filter((p) => p.yhat != null))
        .attr("d", d3.line<typeof pts[0]>()
          .x((d) => x(d.d)).y((d) => y(d.yhat!)).curve(d3.curveMonotoneX))
        .attr("fill", "none").attr("stroke", "#555")
        .attr("stroke-width", dense ? 1.0 : 1.5)
        .attr("stroke-dasharray", "5,4").attr("opacity", 0.6);
    }

    // Faktisk linje
    svg.append("path").datum(pts)
      .attr("d", d3.line<typeof pts[0]>().x((d) => x(d.d)).y((d) => y(d.v)).curve(d3.curveMonotoneX))
      .attr("fill", "none").attr("stroke", accent)
      .attr("stroke-width", dense ? 1.5 : 2.5)
      .attr("stroke-linejoin", "round").attr("stroke-linecap", "round");

    // Datapunkter (bara vid få datapunkter)
    if (!dense) {
      svg.selectAll(".dot").data(pts).join("circle")
        .attr("cx", (d) => x(d.d)).attr("cy", (d) => y(d.v)).attr("r", 2.5)
        .attr("fill", (d) => d.signal ? (SIGNAL_COLORS[d.signal] || accent) : accent)
        .attr("stroke", "#fff").attr("stroke-width", 1);
    }

    // ── Slutetiketter: Faktiskt + Förväntat (+ Föregående år) ──
    const labels: EndLabel[] = [];

    // Faktiskt värde
    labels.push({
      text: "Faktiskt",
      naturalY: y(lastPt.v),
      yPos: y(lastPt.v),
      color: accent,
    });

    // Förväntat värde
    if (hasBand) {
      const lastYhat = pts.filter((p) => p.yhat != null).at(-1);
      if (lastYhat) {
        labels.push({
          text: "Förväntat",
          naturalY: y(lastYhat.yhat!),
          yPos: y(lastYhat.yhat!),
          color: "#555",
          dash: "5,4",
        });
      }
    }

    // Föregående år
    if (refPts.length > 1) {
      const lastRef = refPts[refPts.length - 1];
      labels.push({
        text: "Föreg. år",
        naturalY: y(lastRef.v),
        yPos: y(lastRef.v),
        color: "#aaa",
        dash: "6,4",
      });
    }

    resolveOverlap(labels, 16, mg.t, h - mg.b);

    const connX = w - mg.r;
    labels.forEach((l) => {
      // Connector
      if (Math.abs(l.yPos - l.naturalY) > 2) {
        svg.append("path")
          .attr("d", `M${connX},${l.naturalY} L${connX + 5},${l.naturalY} L${connX + 5},${l.yPos} L${connX + 10},${l.yPos}`)
          .attr("fill", "none").attr("stroke", l.color).attr("stroke-width", 0.8).attr("opacity", 0.5);
      }
      // Punkt vid linjeslut
      svg.append("circle")
        .attr("cx", connX).attr("cy", l.naturalY)
        .attr("r", 3).attr("fill", l.color).attr("stroke", "#fff").attr("stroke-width", 1.5);
      // Text
      svg.append("text")
        .attr("x", connX + 12)
        .attr("y", l.yPos + 3.5)
        .attr("text-anchor", "start")
        .attr("fill", l.color)
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("font-family", FONT)
        .text(l.text);
    });

    // ── Hover: crosshair + tooltip ──
    const hoverLine = svg.append("line")
      .attr("stroke", "#ccc").attr("stroke-width", 0.8).attr("stroke-dasharray", "4,4")
      .attr("y1", mg.t).attr("y2", h - mg.b).style("display", "none");
    const hoverDot = svg.append("circle")
      .attr("r", 4).attr("fill", "#fff").attr("stroke", accent).attr("stroke-width", 2)
      .style("display", "none");

    const tooltipNode = document.createElement("div");
    tooltipNode.style.cssText = "position:fixed;pointer-events:none;z-index:9999;display:none";
    document.body.appendChild(tooltipNode);
    tooltipRef.current = tooltipNode;
    const tooltip = d3.select(tooltipNode);

    const bisect = d3.bisector<typeof pts[0], Date>((d) => d.d).left;

    svg.append("rect")
      .attr("x", mg.l).attr("y", mg.t).attr("width", w - mg.l - mg.r).attr("height", h - mg.t - mg.b)
      .attr("fill", "transparent").style("cursor", "crosshair")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const date = x.invert(mx);
        const idx = Math.min(bisect(pts, date), pts.length - 1);
        const pt = pts[idx];
        if (!pt) return;

        hoverLine.attr("x1", x(pt.d)).attr("x2", x(pt.d)).style("display", null);
        const dotCol = pt.signal ? (SIGNAL_COLORS[pt.signal] || accent) : accent;
        hoverDot.attr("cx", x(pt.d)).attr("cy", y(pt.v)).attr("stroke", dotCol).style("display", null);

        const label = fullEtikett(pt.etikett, pt.period, aktivVyId);
        const fv = fmtVarde(pt.v, kpi.enhet, dec) + suffix;

        let rows = `<div style="font-family:${FONT};font-size:11px;font-weight:500;color:#555;
                      margin-bottom:4px;padding-bottom:3px;border-bottom:1px solid #f0f0f0">${label}</div>
          <div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:1px">
            <span style="font-size:10.5px;color:#888">Faktiskt</span>
            <span style="font-family:${FONT_MONO};font-size:11px;font-weight:600;color:#0a0a0a">${fv}</span>
          </div>`;
        if (pt.yhat != null) {
          rows += `<div style="display:flex;justify-content:space-between;gap:14px">
            <span style="font-size:10.5px;color:#888">Förväntat</span>
            <span style="font-family:${FONT_MONO};font-size:11px;font-weight:500;color:#888">${fmtVarde(pt.yhat, kpi.enhet, dec)}${suffix}</span>
          </div>`;
        }

        const rect = container.getBoundingClientRect();
        const screenX = rect.left + x(pt.d);
        const flip = screenX + 160 > window.innerWidth;

        tooltip
          .style("display", null)
          .style("left", `${screenX}px`)
          .style("top", `${rect.top + y(pt.v) - 16}px`)
          .style("transform", flip ? "translate(-110%, -50%)" : "translate(10px, -50%)")
          .html(`<div style="background:#fff;border:1px solid #e0e0e0;border-radius:7px;
                             padding:7px 12px;box-shadow:0 3px 12px rgba(0,0,0,0.10);
                             white-space:nowrap;min-width:120px;font-family:${FONT}">${rows}</div>`);
      })
      .on("mouseleave", () => {
        hoverLine.style("display", "none");
        hoverDot.style("display", "none");
        tooltip.style("display", "none");
      });

  }, [kpi, vyData, dims, accent, dec, suffix, aktivData, aktivVyId]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 14, width: "95vw", maxWidth: 960, maxHeight: "92vh",
        overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
      }}>
        {/* ── Toolbar ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 16px", borderBottom: "1px solid #f0f0f0",
        }}>
          {harDagar ? (
            <div style={{
              display: "flex", gap: 0,
              background: "#f5f5f3", borderRadius: 5,
              overflow: "hidden",
            }}>
              {(["aggregerat", "dag"] as const).map((mode, i) => {
                const active = mode === "dag" ? visaDagar : !visaDagar;
                return (
                  <button
                    key={mode}
                    onClick={() => setVisaDagar(mode === "dag")}
                    style={{
                      padding: "5px 14px", border: "none",
                      background: active ? "#00664D" : "transparent",
                      fontFamily: FONT, fontSize: 11,
                      fontWeight: active ? 600 : 500,
                      color: active ? "#fff" : "#888",
                      cursor: "pointer", transition: "all 0.15s",
                      borderRight: i === 0 ? "1px solid rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    {mode === "aggregerat" ? "Aggregerat" : "Dag"}
                  </button>
                );
              })}
            </div>
          ) : <div />}
          <button onClick={onClose}
            style={{
              background: "none", border: "1px solid #e0e0e0", borderRadius: 6,
              padding: "5px 14px", fontSize: 12, fontWeight: 500, color: "#888", cursor: "pointer",
              fontFamily: FONT,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#bbb"; e.currentTarget.style.color = "#555"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.color = "#888"; }}
          >
            &#x2715; Stäng
          </button>
        </div>

        {/* ── Titel + undertitel ── */}
        <div style={{ padding: "20px 28px 0" }}>
          <h2 style={{
            fontFamily: FONT_TITEL, fontWeight: 400, fontSize: 21, lineHeight: 1.24,
            color: "#2d2e2d", margin: 0,
          }}>
            {titel}
          </h2>
          <p style={{
            fontFamily: FONT, fontWeight: 400, fontSize: 13, lineHeight: 1.45,
            color: "#999", margin: "4px 0 0",
          }}>
            {undertitel}
          </p>
        </div>

        {/* ── Graf ── */}
        <div ref={measRef} style={{ flex: 1, padding: "16px 20px 20px", position: "relative", minHeight: 200 }}>
          <div ref={chartRef} style={{ width: "100%", height: dims.h || 300, position: "relative" }} />
        </div>
      </div>
    </div>
  );
}
