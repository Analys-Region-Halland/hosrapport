import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import type { KpiData } from "../types";
import { fmtVarde, fmtSuffix } from "../utils/format";

const SIGNAL_LABELS: Record<string, string> = { gron: "I fas", gul: "Bevaka", rod: "Avvikelse" };
const FONT = "'IBM Plex Sans', system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

const STATUS_COLORS: Record<string, string> = {
  gron: "#00AB60",
  gul: "#ea980c",
  rod: "#dc2626",
};

const SIGNAL_COLORS: Record<string, string> = {
  gron: "#16a34a",
  gul: "#ea980c",
  rod: "#dc2626",
};

interface Props {
  kpi: KpiData;
  height?: number;
  vy?: string;
}

export default function KpiChart({ kpi, height = 180, vy }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const tooltipCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    tooltipCleanup.current?.();
    tooltipCleanup.current = null;
    if (!containerRef.current || width < 100 || !kpi.tidsserie.length) return;
    const container = containerRef.current;
    container.innerHTML = "";

    const data = kpi.tidsserie;
    const parse = d3.timeParse("%Y-%m-%d");
    const pts = data
      .map((d) => ({
        d: parse(d.period)!,
        v: d.varde,
        yhat: d.yhat,
        lo: d.yhat_lower,
        hi: d.yhat_upper,
        lo80: d.yhat_lower_80,
        hi80: d.yhat_upper_80,
        signal: d.signal,
        etikett: d.etikett,
      }))
      .filter((d) => d.d);
    if (pts.length < 2) return;

    const hasBand = pts.some((p) => p.yhat != null);

    const H = height;
    const mg = { t: 10, r: 12, b: 28, l: 42 };

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", H)
      .style("display", "block");

    const x = d3
      .scaleTime()
      .domain(d3.extent(pts, (d) => d.d) as [Date, Date])
      .range([mg.l, width - mg.r]);

    // y-domain: inkludera band
    const allVals = pts.flatMap((d) => [d.v, d.lo, d.hi].filter((v): v is number => v != null));
    const ext = d3.extent(allVals) as [number, number];
    const pad = (ext[1] - ext[0]) * 0.1 || 1;
    const y = d3
      .scaleLinear()
      .domain([ext[0] - pad, ext[1] + pad])
      .range([H - mg.b, mg.t])
      .nice();

    // Grid
    y.ticks(4).forEach((tick) => {
      svg.append("line")
        .attr("x1", mg.l).attr("x2", width - mg.r)
        .attr("y1", y(tick)).attr("y2", y(tick))
        .attr("stroke", "#eee").attr("stroke-dasharray", "3,4");
    });

    // X-axel: bara första och sista med datum+år
    const firstPt = pts[0];
    const lastPt = pts[pts.length - 1];
    const fmtEndpoint = (pt: typeof pts[0]) => {
      if (vy === "dag" || vy === "vecka") return `${pt.etikett} ${pt.d.getFullYear()}`;
      return pt.etikett;
    };

    svg.append("line")
      .attr("x1", mg.l).attr("x2", width - mg.r)
      .attr("y1", H - mg.b).attr("y2", H - mg.b)
      .attr("stroke", "#e0e0e0");

    svg.append("text")
      .attr("x", mg.l).attr("y", H - mg.b + 14)
      .attr("text-anchor", "start")
      .attr("fill", "#999").attr("font-size", "10px").attr("font-family", FONT)
      .text(fmtEndpoint(firstPt));

    svg.append("text")
      .attr("x", width - mg.r).attr("y", H - mg.b + 14)
      .attr("text-anchor", "end")
      .attr("fill", "#999").attr("font-size", "10px").attr("font-family", FONT)
      .text(fmtEndpoint(lastPt));

    // Y-axel
    svg.append("g")
      .attr("transform", `translate(${mg.l},0)`)
      .call(
        d3.axisLeft(y).ticks(4).tickSize(0).tickPadding(6)
          .tickFormat((d) => {
            const v = d as number;
            if (kpi.enhet === "procent") return v.toFixed(0) + "%";
            if (kpi.enhet === "minuter") return v.toFixed(0);
            return v.toLocaleString("sv-SE");
          })
      )
      .call((g) => g.select(".domain").remove())
      .selectAll("text")
      .attr("fill", "#999").attr("font-size", "10px")
      .attr("font-family", "'IBM Plex Sans', sans-serif")
      .style("font-feature-settings", "'tnum'");

    const lineColor = STATUS_COLORS[kpi.status] || "#00AB60";

    // Prediktionsband (95 % yttre, 80 % inre)
    if (hasBand) {
      // 95 %-band (yttre, ljusare)
      svg.append("path").datum(pts.filter((p) => p.lo != null))
        .attr("d", d3.area<typeof pts[0]>()
          .x((d) => x(d.d))
          .y0((d) => y(d.lo!))
          .y1((d) => y(d.hi!))
          .curve(d3.curveMonotoneX))
        .attr("fill", "#C1E8C4").attr("opacity", 0.18);

      // 80 %-band (inre, mörkare)
      const pts80 = pts.filter((p) => p.lo80 != null);
      if (pts80.length > 0) {
        svg.append("path").datum(pts80)
          .attr("d", d3.area<typeof pts[0]>()
            .x((d) => x(d.d))
            .y0((d) => y(d.lo80!))
            .y1((d) => y(d.hi80!))
            .curve(d3.curveMonotoneX))
          .attr("fill", "#C1E8C4").attr("opacity", 0.32);
      }

      // Prediktionslinje (streckad svart)
      svg.append("path").datum(pts.filter((p) => p.yhat != null))
        .attr("d", d3.line<typeof pts[0]>()
          .x((d) => x(d.d))
          .y((d) => y(d.yhat!))
          .curve(d3.curveMonotoneX))
        .attr("fill", "none").attr("stroke", "#333")
        .attr("stroke-width", 1.2).attr("stroke-dasharray", "5,4")
        .attr("opacity", 0.55);
    }

    // Faktisk linje
    svg.append("path").datum(pts)
      .attr("d", d3.line<typeof pts[0]>()
        .x((d) => x(d.d)).y((d) => y(d.v))
        .curve(d3.curveMonotoneX))
      .attr("fill", "none").attr("stroke", lineColor).attr("stroke-width", 2);

    // Datapunkter med signalfärg
    if (pts.length <= 20) {
      svg.selectAll(".pt").data(pts).join("circle")
        .attr("cx", (d) => x(d.d)).attr("cy", (d) => y(d.v))
        .attr("r", 2.5)
        .attr("fill", (d) => d.signal ? (SIGNAL_COLORS[d.signal] || lineColor) : lineColor)
        .attr("stroke", "white").attr("stroke-width", 1.2);
    }

    // Sista punkt
    const last = pts[pts.length - 1];
    const lastCol = last.signal ? (SIGNAL_COLORS[last.signal] || lineColor) : lineColor;
    svg.append("circle")
      .attr("cx", x(last.d)).attr("cy", y(last.v))
      .attr("r", 4).attr("fill", lastCol).attr("stroke", "white").attr("stroke-width", 2);

    // Hover — ljus tooltip, position:fixed, med faktiskt/förväntat/status
    const tooltipNode = document.createElement("div");
    tooltipNode.style.cssText = "position:fixed;pointer-events:none;z-index:9999;display:none";
    document.body.appendChild(tooltipNode);
    const tooltip = d3.select(tooltipNode);

    const sfx = fmtSuffix(kpi.enhet);
    const decs = kpi.enhet === "procent" ? 1 : 0;

    svg.selectAll(".hover-target").data(pts).join("circle")
      .attr("cx", (d) => x(d.d)).attr("cy", (d) => y(d.v))
      .attr("r", 10).attr("fill", "transparent").style("cursor", "default")
      .on("mouseenter", (_event, d) => {
        const dateLabel = `${d.etikett} ${d.d.getFullYear()}`;
        const fv = fmtVarde(d.v, kpi.enhet, decs) + sfx;

        let rows = `
          <div style="font-family:${FONT};font-size:11px;font-weight:500;color:#555;
                      margin-bottom:5px;padding-bottom:4px;border-bottom:1px solid #f0f0f0">
            ${dateLabel}
          </div>
          <div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:2px">
            <span style="font-family:${FONT};font-size:10px;color:#888">Faktiskt</span>
            <span style="font-family:${FONT_MONO};font-size:11px;font-weight:600;color:#0a0a0a">${fv}</span>
          </div>`;

        if (d.yhat != null) {
          const ev = fmtVarde(d.yhat, kpi.enhet, decs) + sfx;
          rows += `
          <div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:2px">
            <span style="font-family:${FONT};font-size:10px;color:#888">Förväntat</span>
            <span style="font-family:${FONT_MONO};font-size:11px;font-weight:500;color:#888">${ev}</span>
          </div>`;
        }

        if (d.signal) {
          const sc = SIGNAL_COLORS[d.signal] || "#888";
          const sl = SIGNAL_LABELS[d.signal] || "";
          rows += `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:14px">
            <span style="font-family:${FONT};font-size:10px;color:#888">Status</span>
            <span style="display:flex;align-items:center;gap:3px">
              <span style="width:5px;height:5px;border-radius:50%;background:${sc}"></span>
              <span style="font-family:${FONT};font-size:10px;font-weight:500;color:${sc}">${sl}</span>
            </span>
          </div>`;
        }

        tooltip.style("display", null)
          .html(`<div style="background:#fff;border:1px solid #e0e0e0;border-radius:7px;
                             padding:7px 11px;box-shadow:0 3px 12px rgba(0,0,0,0.08);
                             white-space:nowrap;min-width:120px">${rows}</div>`);
      })
      .on("mousemove", (event) => {
        const rect = container.getBoundingClientRect();
        const [mx, my] = d3.pointer(event, container);
        tooltip
          .style("left", `${rect.left + mx + 14}px`)
          .style("top", `${rect.top + my - 8}px`);
      })
      .on("mouseleave", () => tooltip.style("display", "none"));

    const cleanup = () => { tooltipNode.remove(); };
    tooltipCleanup.current = cleanup;
    return cleanup;
  }, [kpi, width, height, vy]);

  return (
    <div ref={containerRef} style={{ width: "100%", height, position: "relative" }} />
  );
}
