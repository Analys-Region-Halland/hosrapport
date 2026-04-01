import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { KpiData } from "../types";
import { fmtVarde, fmtSuffix } from "../utils/format";

const DEPT_COLORS = [
  "#2DB8F6", "#6473D9", "#FF5F4A", "#FFD939", "#895B42", "#00AB60",
];
const STATUS_COLORS: Record<string, string> = {
  gron: "#16a34a", gul: "#ea980c", rod: "#dc2626",
};
const FONT = "'IBM Plex Sans', system-ui, sans-serif";

function enhetLabel(e: string): string {
  if (e === "procent") return "Procent";
  if (e === "minuter") return "Minuter";
  if (e === "antal") return "Antal";
  return e.charAt(0).toUpperCase() + e.slice(1);
}

interface Pt { d: Date; v: number; signal?: string; etikett?: string }
interface BandPt { d: Date; lo: number; hi: number; lo80?: number; hi80?: number; yhat: number }
interface SeriesData {
  id: string;
  name: string;
  color: string;
  pts: Pt[];
  latest: number;
  status?: string;
  band?: BandPt[];
}

// ════════════════════════════════════════
//  FacetedChart
// ════════════════════════════════════════

interface Props { kpi: KpiData; vy?: string }

export default function FacetedChart({ kpi, vy }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const accent = STATUS_COLORS[kpi.status] || "#525252";

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(Math.floor(entries[0].contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { allSeries, xDomain } = useMemo(() => {
    const parse = d3.timeParse("%Y-%m-%d");
    const result: SeriesData[] = [];

    const mainPts = kpi.tidsserie
      .map((d) => ({ d: parse(d.period)!, v: d.varde, signal: d.signal, etikett: d.etikett }))
      .filter((d) => d.d);
    const bandPts = kpi.tidsserie
      .filter((d) => d.yhat != null && d.yhat_lower != null)
      .map((d) => ({
        d: parse(d.period)!,
        lo: d.yhat_lower!, hi: d.yhat_upper!,
        lo80: d.yhat_lower_80, hi80: d.yhat_upper_80,
        yhat: d.yhat!,
      }))
      .filter((d) => d.d);

    result.push({
      id: kpi.id,
      name: "Totalt",
      color: accent,
      pts: mainPts,
      latest: kpi.senaste,
      status: kpi.status,
      band: bandPts.length > 0 ? bandPts : undefined,
    });

    if (kpi.undernivaer) {
      kpi.undernivaer.forEach((sub, i) => {
        const subPts = sub.tidsserie
          .map((d) => ({ d: parse(d.period)!, v: d.varde, signal: d.signal, etikett: d.etikett }))
          .filter((d) => d.d);
        const subBand = sub.tidsserie
          .filter((d) => d.yhat != null && d.yhat_lower != null)
          .map((d) => ({
            d: parse(d.period)!,
            lo: d.yhat_lower!, hi: d.yhat_upper!,
            lo80: d.yhat_lower_80, hi80: d.yhat_upper_80,
            yhat: d.yhat!,
          }))
          .filter((d) => d.d);

        result.push({
          id: sub.id,
          name: sub.namn,
          color: DEPT_COLORS[i % DEPT_COLORS.length],
          pts: subPts,
          latest: sub.senaste,
          status: sub.status,
          band: subBand.length > 0 ? subBand : undefined,
        });
      });
    }

    const allDates = result.flatMap((s) => s.pts.map((p) => p.d));
    const xd = d3.extent(allDates) as [Date, Date];

    return { allSeries: result, xDomain: xd };
  }, [kpi, accent]);

  const expandedSeries = expandedId ? allSeries.find(s => s.id === expandedId) : null;

  if (containerWidth === 0) {
    return <div ref={outerRef} style={{ width: "100%" }} />;
  }

  const hasFacets = allSeries.length > 1;
  const cols = 2;
  const gap = 14;
  const dec = kpi.enhet === "procent" ? 1 : 0;
  const suffix = fmtSuffix(kpi.enhet);
  const panelW = Math.floor((containerWidth - (cols - 1) * gap) / cols);

  const fmtPeriodRange = () => {
    const firstPt = allSeries[0]?.pts[0];
    const lastPt = allSeries[0]?.pts[allSeries[0].pts.length - 1];
    const fmtPt = (pt: Pt | undefined) => {
      if (!pt) return "";
      if (pt.etikett) {
        const yr = pt.d.getFullYear();
        if (vy === "dag" || vy === "vecka") return `${pt.etikett} ${yr}`;
        return pt.etikett;
      }
      return `${d3.timeFormat("%-d %b")(pt.d)} ${pt.d.getFullYear()}`;
    };
    return `${fmtPt(firstPt)}\u2013${fmtPt(lastPt)}`;
  };

  return (
    <div ref={outerRef} style={{ width: "100%" }}>

      {/* ── Diagram ── */}
      {expandedSeries ? (
        <>
          {/* Rubrik + tillbaka-knapp */}
          <div style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            marginBottom: 12, gap: 8,
          }}>
            <div>
              <div style={{
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: 17, fontWeight: 400, color: "#2d2e2d", lineHeight: 1.3,
              }}>
                {kpi.namn}{expandedSeries.name !== "Totalt" ? `, ${expandedSeries.name}` : ""}
              </div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: "#999", marginTop: 3 }}>
                {enhetLabel(kpi.enhet)} &middot; {fmtPeriodRange()}
              </div>
            </div>
            <button
              onClick={() => setExpandedId(null)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 10px", border: "1px solid #d4d4d4", borderRadius: 5,
                background: "#fff", fontSize: 11, fontWeight: 500,
                fontFamily: FONT, color: "#666", cursor: "pointer", flexShrink: 0,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 1.5L3.5 5l3 3.5" />
              </svg>
              Visa alla
            </button>
          </div>
          <Panel
            series={expandedSeries}
            xDomain={xDomain}
            width={containerWidth}
            enhet={kpi.enhet}
            dec={dec}
            suffix={suffix}
            isSingle
            vy={vy}
          />
        </>
      ) : hasFacets ? (
        <div>
          {/* Övergripande grafrubrik + info-knapp */}
          <div style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            marginBottom: 12, gap: 8,
          }}>
            <div>
              <div style={{
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: 17, fontWeight: 400, color: "#2d2e2d", lineHeight: 1.3,
              }}>
                {kpi.namn}
              </div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: "#999", marginTop: 3 }}>
                {enhetLabel(kpi.enhet)} &middot; {fmtPeriodRange()}
              </div>
            </div>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => setShowInfo(!showInfo)}
                title="Om indikatorn"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", border: "1px solid #d4d4d4", borderRadius: 5,
                  background: showInfo ? "#f0fdf4" : "#fff", fontSize: 11, fontWeight: 500,
                  fontFamily: FONT, color: showInfo ? "#00664D" : "#888",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="6.5" />
                  <path d="M8 7v4M8 5.5v0" strokeLinecap="round" />
                </svg>
                Info
              </button>
              {showInfo && (
                <InfoPopover kpi={kpi} onClose={() => setShowInfo(false)} />
              )}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap,
            }}
          >
          {allSeries.map((s) => (
            <div
              key={s.id}
              onClick={() => setExpandedId(s.id)}
              style={{ cursor: "pointer" }}
            >
              <Panel
                series={s}
                xDomain={xDomain}
                width={panelW}
                enhet={kpi.enhet}
                dec={dec}
                suffix={suffix}
                vy={vy}
                kpiNamn={kpi.namn}
              />
            </div>
          ))}
          </div>
        </div>
      ) : (
        <Panel
          series={allSeries[0]}
          xDomain={xDomain}
          width={containerWidth}
          enhet={kpi.enhet}
          dec={dec}
          suffix={suffix}
          isSingle
          kpiNamn={kpi.namn}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════
//  InfoPopover
// ════════════════════════════════════════

function InfoPopover({ kpi, onClose }: { kpi: KpiData; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const enhetLabel =
    kpi.enhet === "procent"
      ? "Procent"
      : kpi.enhet === "minuter"
        ? "Minuter"
        : "Antal";

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: 6,
        width: 300,
        background: "#fff",
        border: "1px solid #e0e0dc",
        borderRadius: 10,
        padding: "14px 16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        zIndex: 20,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#1a1a1a",
          marginBottom: 8,
        }}
      >
        {kpi.namn}
      </div>

      {kpi.beskrivning && (
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            color: "#555",
            marginBottom: 10,
          }}
        >
          {kpi.beskrivning}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          fontSize: 11,
          color: "#888",
          borderTop: "1px solid #f0f0ee",
          paddingTop: 8,
        }}
      >
        <span>
          Enhet: <strong style={{ color: "#555" }}>{enhetLabel}</strong>
        </span>
        <span>
          Riktning:{" "}
          <strong style={{ color: "#555" }}>
            {kpi.inverterad ? "Lagre ar battre" : "Hogre ar battre"}
          </strong>
        </span>
      </div>

      {kpi.undernivaer && (
        <div
          style={{
            fontSize: 11,
            color: "#888",
            marginTop: 6,
          }}
        >
          Nedbrytning: {kpi.undernivaer.map((s) => s.namn).join(", ")}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
//  Panel — en enskild D3-graf
// ════════════════════════════════════════

interface PanelProps {
  series: SeriesData;
  xDomain: [Date, Date];
  width: number;
  enhet: string;
  dec: number;
  suffix: string;
  isSingle?: boolean;
  vy?: string;
  kpiNamn?: string;
}

function Panel(props: PanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tooltipCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || props.width === 0) return;
    tooltipCleanup.current?.();
    el.innerHTML = "";
    const cleanup = drawPanel(el, props);
    tooltipCleanup.current = cleanup;
    return () => { cleanup(); };
  }, [
    props.series,
    props.xDomain,
    props.width,
    props.enhet,
    props.kpiNamn,
    props.dec,
    props.suffix,
    props.isSingle,
    props.vy,
  ]);

  return <div ref={ref} style={{ position: "relative" }} />;
}

// ════════════════════════════════════════
//  drawPanel — imperativ D3
//  Tidsserie-stil (OWID-gridlines,
//  curveMonotoneX, crosshair-hover)
// ════════════════════════════════════════

function drawPanel(container: HTMLDivElement, p: PanelProps): () => void {
  const {
    series, xDomain,
    width, enhet, dec, suffix,
    isSingle = false,
    vy,
    kpiNamn,
  } = p;

  // Grafrubrik tar extra plats i single-läge
  const TITEL_RUBRIK = "'Source Serif 4', Georgia, serif";
  const hasTitel = isSingle && kpiNamn;
  const titelH = hasTitel ? 44 : 0;

  const h = (isSingle
    ? Math.max(200, Math.round(width * 0.55))
    : Math.round(width * 0.82)) + titelH;

  const mg = isSingle
    ? { t: 16 + titelH, r: 20, b: 34, l: 48 }
    : { t: 28, r: 8, b: 28, l: 38 };

  const plotW = width - mg.l - mg.r;
  const plotH = h - mg.t - mg.b;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", h)
    .style("display", "block");

  // ── Grafrubrik (klassisk, Source Serif 4) — bara i single/expanderat läge ──
  if (hasTitel) {
    // Huvudrubrik: KPI-namn + serie-namn om det inte är "Totalt"
    const fullTitle = series.name !== "Totalt"
      ? `${kpiNamn}, ${series.name}`
      : kpiNamn!;

    svg.append("text")
      .attr("x", mg.l)
      .attr("y", 22)
      .attr("font-size", "17px")
      .attr("font-weight", "400")
      .attr("font-family", TITEL_RUBRIK)
      .attr("fill", "#2d2e2d")
      .text(fullTitle);

    // Undertitel: enhet · period
    const fmtDate = (d: Date) => `${d3.timeFormat("%-d %b")(d)} ${d.getFullYear()}`;
    const subText = `${enhet.charAt(0).toUpperCase() + enhet.slice(1)} · ${fmtDate(xDomain[0])}–${fmtDate(xDomain[1])}`;
    svg.append("text")
      .attr("x", mg.l)
      .attr("y", 38)
      .attr("font-size", "11px")
      .attr("font-weight", "400")
      .attr("font-family", FONT)
      .attr("fill", "#999")
      .text(subText);
  }

  // ── Panelrubrik (kompakt, i grid-läge) ──
  if (!hasTitel) {
    const titleSize = "12px";
    svg
      .append("text")
      .attr("x", mg.l)
      .attr("y", 16)
      .attr("font-size", titleSize)
      .attr("font-weight", "600")
      .attr("font-family", FONT)
      .attr("fill", series.color)
      .text(series.name);

  }

  const g = svg
    .append("g")
    .attr("transform", `translate(${mg.l},${mg.t})`);

  const x = d3.scaleTime().domain(xDomain).range([0, plotW]);

  // ── Individuell y-axel per panel ──
  const ownVals = [
    ...series.pts.map((d) => d.v),
    ...(series.band || []).flatMap((b) => [b.lo, b.hi]),
  ];
  const [yMin, yMax] = d3.extent(ownVals) as [number, number];
  const span = yMax - yMin || 1;
  const y = d3.scaleLinear()
    .domain([yMin - span * 0.1, yMax + span * 0.1])
    .range([plotH, 0]).nice();

  // ── Gridlines — OWID-stil ──
  const yTicks = y.ticks(isSingle ? 5 : 4);
  for (const t of yTicks) {
    const isZero = Math.abs(t) < 0.001;
    g.append("line")
      .attr("x1", 0).attr("x2", plotW)
      .attr("y1", y(t)).attr("y2", y(t))
      .attr("stroke", isZero ? "#aaa" : "#d2d2d2")
      .attr("stroke-width", isZero ? 1 : 0.7)
      .attr("stroke-dasharray", isZero ? "none" : "4,4");

    g.append("text")
      .attr("x", -8).attr("y", y(t) + 4)
      .attr("text-anchor", "end")
      .attr("fill", "#5b5b5b")
      .attr("font-size", isSingle ? "12px" : "10px")
      .attr("font-weight", "400")
      .attr("font-family", FONT)
      .style("font-feature-settings", '"tnum"')
      .text(
        enhet === "procent"
          ? `${t.toFixed(0)}%`
          : t.toLocaleString("sv-SE", {
              maximumFractionDigits: Math.abs(t) >= 100 ? 0 : 1,
            }),
      );
  }

  // ── X-axel — bracket style ──
  g.append("line")
    .attr("x1", 0).attr("x2", plotW)
    .attr("y1", plotH).attr("y2", plotH)
    .attr("stroke", "#bbb").attr("stroke-width", 0.7);

  // Start bracket
  g.append("line")
    .attr("x1", 0).attr("x2", 0)
    .attr("y1", plotH - 4).attr("y2", plotH + 4)
    .attr("stroke", "#999").attr("stroke-width", 1);

  // End bracket
  g.append("line")
    .attr("x1", plotW).attr("x2", plotW)
    .attr("y1", plotH - 4).attr("y2", plotH + 4)
    .attr("stroke", "#999").attr("stroke-width", 1);

  // X-axeletiketter — använd vy-etiketter från data
  const firstPt = series.pts[0];
  const lastPt = series.pts[series.pts.length - 1];
  const fmtAxisLabel = (pt: Pt) => {
    if (!pt) return "";
    if (pt.etikett) {
      // Lägg till år för dag/vecka
      const yr = pt.d.getFullYear();
      if (vy === "dag" || vy === "vecka") return `${pt.etikett} ${yr}`;
      return pt.etikett;
    }
    return `${d3.timeFormat("%-d %b")(pt.d)} ${pt.d.getFullYear()}`;
  };

  g.append("text")
    .attr("x", 2).attr("y", plotH + 18)
    .attr("text-anchor", "start")
    .attr("fill", "#5b5b5b")
    .attr("font-size", isSingle ? "12px" : "10px")
    .attr("font-family", FONT)
    .text(fmtAxisLabel(firstPt));

  g.append("text")
    .attr("x", plotW - 2).attr("y", plotH + 18)
    .attr("text-anchor", "end")
    .attr("fill", "#5b5b5b")
    .attr("font-size", isSingle ? "12px" : "10px")
    .attr("font-family", FONT)
    .text(fmtAxisLabel(lastPt));


  // ── Kurvgeneratorer ──
  const lineGen = d3
    .line<Pt>()
    .x((d) => x(d.d))
    .y((d) => y(d.v))
    .curve(d3.curveMonotoneX);

  // ── Prediktionsband (95 % yttre, 80 % inre) ──
  if (series.band && series.band.length > 0) {
    // 95 %-band (yttre, ljusare)
    g.append("path")
      .datum(series.band)
      .attr("d", d3.area<BandPt>()
        .x((d) => x(d.d)).y0((d) => y(d.lo)).y1((d) => y(d.hi))
        .curve(d3.curveMonotoneX))
      .attr("fill", series.color).attr("opacity", 0.08);

    // 80 %-band (inre, mörkare)
    const band80 = series.band.filter((b) => b.lo80 != null);
    if (band80.length > 0) {
      g.append("path")
        .datum(band80)
        .attr("d", d3.area<BandPt>()
          .x((d) => x(d.d)).y0((d) => y(d.lo80!)).y1((d) => y(d.hi80!))
          .curve(d3.curveMonotoneX))
        .attr("fill", series.color).attr("opacity", 0.18);
    }

    // Prediktionslinje (streckad svart)
    g.append("path")
      .datum(series.band)
      .attr("d", d3.line<BandPt>()
        .x((d) => x(d.d)).y((d) => y(d.yhat))
        .curve(d3.curveMonotoneX))
      .attr("fill", "none").attr("stroke", "#333")
      .attr("stroke-width", isSingle ? 1.3 : 1)
      .attr("stroke-dasharray", isSingle ? "5,4" : "3,3")
      .attr("opacity", 0.45);
  }

  // ── Adaptiv stil ──
  const dense = series.pts.length > 30;

  // ── Linje — tunnare vid tät data ──
  g.append("path")
    .datum(series.pts)
    .attr("d", lineGen)
    .attr("fill", "none")
    .attr("stroke", series.color)
    .attr("stroke-width", dense ? (isSingle ? 1.3 : 1.0) : (isSingle ? 2.5 : 2))
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round");

  // ── Datapunkter — bara vid få datapunkter ──
  if (!dense) {
    const sigCol: Record<string, string> = { gron: "#16a34a", gul: "#ea980c", rod: "#dc2626" };
    g.selectAll(".dot")
      .data(series.pts)
      .join("circle")
      .attr("cx", (d) => x(d.d))
      .attr("cy", (d) => y(d.v))
      .attr("r", isSingle ? 3 : 2)
      .attr("fill", (d) => d.signal ? (sigCol[d.signal] || series.color) : series.color)
      .attr("stroke", "#fff")
      .attr("stroke-width", isSingle ? 1.5 : 1);
  }

  // ── Senaste punkt — alltid synlig ──
  const last = series.pts[series.pts.length - 1];
  if (last) {
    g.append("circle")
      .attr("cx", x(last.d)).attr("cy", y(last.v))
      .attr("r", dense ? (isSingle ? 3 : 2.5) : (isSingle ? 4.5 : 3.5))
      .attr("fill", series.color)
      .attr("stroke", "#fff")
      .attr("stroke-width", dense ? 1.5 : (isSingle ? 2.5 : 2));
  }

  // ── Crosshair + tooltip ──
  const gridTop = yTicks.length > 0 ? y(yTicks[yTicks.length - 1]) : 0;
  const gridBottom = yTicks.length > 0 ? y(yTicks[0]) : plotH;

  const hoverLine = g
    .append("line")
    .attr("y1", gridTop).attr("y2", gridBottom)
    .attr("stroke", series.color).attr("stroke-width", 0.8)
    .attr("opacity", 0).attr("pointer-events", "none");

  const hoverDot = g
    .append("circle")
    .attr("r", isSingle ? 4.5 : 3.5)
    .attr("fill", series.color).attr("stroke", "#fff").attr("stroke-width", 2)
    .attr("opacity", 0).attr("pointer-events", "none");

  // Tooltip på document.body — kan aldrig klippas av overflow
  const tooltipNode = document.createElement("div");
  tooltipNode.style.cssText = `position:fixed;pointer-events:none;z-index:9999;display:none;
    background:rgba(255,255,255,0.97);border:1px solid #e0e0dc;border-radius:8px;
    padding:6px 10px;box-shadow:0 2px 12px rgba(0,0,0,0.08);font-family:${FONT};
    font-size:11px;line-height:1.5;white-space:nowrap;font-feature-settings:"tnum"`;
  document.body.appendChild(tooltipNode);
  const tooltip = d3.select(tooltipNode);

  const bisect = d3.bisector<Pt, Date>((d) => d.d).left;

  g.append("rect")
    .attr("width", plotW).attr("height", plotH)
    .attr("fill", "none").attr("pointer-events", "all")
    .on("mousemove", (event) => {
      const [mx] = d3.pointer(event);
      const date = x.invert(mx);
      const idx = Math.min(bisect(series.pts, date), series.pts.length - 1);
      const pt = series.pts[idx];
      if (!pt) return;

      hoverLine.attr("x1", x(pt.d)).attr("x2", x(pt.d)).attr("opacity", 0.15);
      hoverDot.attr("cx", x(pt.d)).attr("cy", y(pt.v)).attr("opacity", 1);

      const dateLabel = pt.etikett
        ? (vy === "dag" || vy === "vecka" ? `${pt.etikett} ${pt.d.getFullYear()}` : pt.etikett)
        : `${d3.timeFormat("%-d %b")(pt.d)} ${pt.d.getFullYear()}`;
      let html = `<div style="font-weight:600;color:#333;margin-bottom:2px">${dateLabel}</div>`;
      html += `<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:1px">
        <span style="color:#888;font-size:10px">Faktiskt</span>
        <span style="font-weight:600;font-family:'IBM Plex Mono',monospace">${fmtVarde(pt.v, enhet, dec)}${suffix}</span>
      </div>`;
      // Förväntat från band
      const bandIdx = series.band ? series.band.findIndex((b) => +b.d === +pt.d) : -1;
      if (bandIdx >= 0 && series.band) {
        const bp = series.band[bandIdx];
        html += `<div style="display:flex;justify-content:space-between;gap:12px">
          <span style="color:#888;font-size:10px">Förväntat</span>
          <span style="font-weight:500;font-family:'IBM Plex Mono',monospace;color:#888">${fmtVarde(bp.yhat, enhet, dec)}${suffix}</span>
        </div>`;
      }

      const rect = container.getBoundingClientRect();
      const screenX = rect.left + mg.l + x(pt.d) + 14;
      const screenY = rect.top + Math.max(4, mg.t + y(pt.v) - 20);
      const flip = screenX + 130 > window.innerWidth;

      tooltip
        .style("display", null)
        .style("left", flip ? `${rect.left + mg.l + x(pt.d) - 14}px` : `${screenX}px`)
        .style("top", `${screenY}px`)
        .style("transform", flip ? "translateX(-100%)" : "none")
        .html(html);
    })
    .on("mouseleave", () => {
      hoverLine.attr("opacity", 0);
      hoverDot.attr("opacity", 0);
      tooltip.style("display", "none");
    });

  return () => { tooltipNode.remove(); };
}

