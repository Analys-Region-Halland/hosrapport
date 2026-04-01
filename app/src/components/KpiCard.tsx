import { useState, useRef, useEffect } from "react";
import * as d3 from "d3";
import type { KpiData, SubKpi, VyData } from "../types";
import { fmtVarde, fmtSuffix, fullEtikett } from "../utils/format";

// ── Färger baserat på conformal signal (tre nivåer) ──
const SIGNAL: Record<string, { color: string; bg: string; label: string }> = {
  gron: { color: "#16a34a", bg: "#f0fdf4", label: "I fas" },
  gul:  { color: "#ea980c", bg: "#fffbeb", label: "Bevaka" },
  rod:  { color: "#dc2626", bg: "#fef2f2", label: "Avvikelse" },
};
const NEUTRAL = { color: "#a3a3a3", bg: "#f5f5f5", label: "" };

const FONT = "'IBM Plex Sans', sans-serif";
const mono: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontFeatureSettings: "'tnum'",
  fontVariantNumeric: "tabular-nums",
};

// ── Platshållardefinitioner tills R-pipelinen levererar beskrivning ──
const DEFINITIONS: Record<string, string> = {
  belaggning: "Andel disponibla vårdplatser som är belagda vid mättillfället. Beräknas som antal belagda platser dividerat med antal disponibla platser.",
  akutbesok: "Totalt antal patientbesök på akutmottagningen under perioden, oavsett prioritet och utfall.",
  vantetid: "Median av tiden i minuter från ankomst till akutmottagningen till läkarbedömning, för samtliga patienter under perioden.",
  ambulans: "Antal ambulansuppdrag som genomförts under perioden, inklusive primäruppdrag och sekundärtransporter.",
  inlaggningar: "Antal patienter som lagts in på vårdavdelning via akutmottagningen under perioden.",
  utskrivningsklara: "Antal patienter som bedömts medicinskt färdigbehandlade men som kvarstår i slutenvård i väntan på kommunal insats.",
};

// ── TitleWithTooltip ──
function TitleWithTooltip({ title, description }: { title: string; description?: string }) {
  const [show, setShow] = useState(false);
  const base: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.3, letterSpacing: "-0.01em" };
  if (!description) return <div style={base}>{title}</div>;
  return (
    <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} style={{ position: "relative" }}>
      <span style={{ ...base, cursor: "help", borderBottom: "1px dashed #ccc", paddingBottom: 1 }}>{title}</span>
      {show && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#1a1a1a", color: "#e8e8e8",
          fontFamily: FONT, fontSize: 12, fontWeight: 400, lineHeight: 1.5,
          padding: "9px 12px", borderRadius: 6, maxWidth: 280, zIndex: 30, pointerEvents: "none",
          boxShadow: "0 4px 14px rgba(0,0,0,0.18)", whiteSpace: "normal",
        }}>{description}</div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
//  MiniChart — D3-graf med axlar
// ════════════════════════════════════════════

function MiniChart({ kpi, vy, accent }: { kpi: KpiData; vy: string; accent: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => {
      const w = Math.floor(e[0].contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!ref.current || width < 80 || kpi.tidsserie.length < 2) return;
    const el = ref.current;
    el.innerHTML = "";

    const parse = d3.timeParse("%Y-%m-%d");
    const pts = kpi.tidsserie.map((d) => ({
      d: parse(d.period)!, v: d.varde,
      lo: d.yhat_lower, hi: d.yhat_upper, signal: d.signal,
      etikett: d.etikett, period: d.period,
    })).filter((d) => d.d);

    const H = 90;
    const mg = { t: 4, r: 4, b: 18, l: 32 };

    const svg = d3.select(el).append("svg")
      .attr("width", width).attr("height", H).style("display", "block");

    const x = d3.scaleTime()
      .domain(d3.extent(pts, (d) => d.d) as [Date, Date])
      .range([mg.l, width - mg.r]);

    // Referenspunkter — samma period föregående år (mappade till samma x)
    const hasRef = kpi.referens_serie && kpi.referens_serie.length > 0;
    const refPts = hasRef
      ? kpi.referens_serie!.map((d, i) => ({
          d: pts[Math.min(i, pts.length - 1)]?.d,
          v: d.varde,
        })).filter((d) => d.d)
      : [];

    // Kontextserier (andra regioner) — parsa
    const hasKontext = kpi.kontext_serier && kpi.kontext_serier.length > 0;
    const kontextParsed = hasKontext
      ? kpi.kontext_serier!.map((ks) => ({
          namn: ks.namn,
          pts: ks.tidsserie.map((d) => ({ d: parse(d.period)!, v: d.varde })).filter((d) => d.d),
        }))
      : [];
    const hasRiket = kpi.riket_serie && kpi.riket_serie.length > 0;
    const riketPts = hasRiket
      ? kpi.riket_serie!.map((d) => ({ d: parse(d.period)!, v: d.varde })).filter((d) => d.d)
      : [];

    // Y-domän inkl referens + kontext
    const allV = pts.flatMap((d) => [d.v, d.lo, d.hi].filter((v): v is number => v != null));
    if (refPts.length > 0) allV.push(...refPts.map((d) => d.v));
    if (hasKontext) kontextParsed.forEach((ks) => allV.push(...ks.pts.map((p) => p.v)));
    if (hasRiket) allV.push(...riketPts.map((d) => d.v));
    const [lo, hi] = d3.extent(allV) as [number, number];
    const pad = (hi - lo) * 0.12 || 1;
    const y = d3.scaleLinear().domain([lo - pad, hi + pad]).range([H - mg.b, mg.t]).nice();

    // Y-axel
    const yTicks = y.ticks(3);
    const yFmt = (v: number) => kpi.enhet === "procent" ? `${v.toFixed(0)}%` : v.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
    for (const t of yTicks) {
      svg.append("line")
        .attr("x1", mg.l).attr("x2", width - mg.r)
        .attr("y1", y(t)).attr("y2", y(t))
        .attr("stroke", "#eee").attr("stroke-width", 0.5);
      svg.append("text")
        .attr("x", mg.l - 4).attr("y", y(t) + 3.5)
        .attr("text-anchor", "end").attr("fill", "#bbb")
        .attr("font-size", "9px").attr("font-family", FONT)
        .style("font-feature-settings", '"tnum"')
        .text(yFmt(t));
    }

    // X-axel
    const first = pts[0];
    const last = pts[pts.length - 1];
    svg.append("line")
      .attr("x1", mg.l).attr("x2", width - mg.r)
      .attr("y1", H - mg.b).attr("y2", H - mg.b)
      .attr("stroke", "#e0e0e0").attr("stroke-width", 0.5);
    svg.append("text")
      .attr("x", mg.l).attr("y", H - 3)
      .attr("text-anchor", "start").attr("fill", "#bbb")
      .attr("font-size", "8.5px").attr("font-family", FONT)
      .text(fullEtikett(first.etikett, first.period, vy));
    svg.append("text")
      .attr("x", width - mg.r).attr("y", H - 3)
      .attr("text-anchor", "end").attr("fill", "#bbb")
      .attr("font-size", "8.5px").attr("font-family", FONT)
      .text(fullEtikett(last.etikett, last.period, vy));

    // Kontextlinjer — andra regioner (tunna gråa)
    if (hasKontext) {
      for (const ks of kontextParsed) {
        if (ks.pts.length < 2) continue;
        svg.append("path").datum(ks.pts)
          .attr("d", d3.line<typeof ks.pts[0]>()
            .x((d) => x(d.d)).y((d) => y(d.v)).curve(d3.curveMonotoneX))
          .attr("fill", "none").attr("stroke", "#d0d0d0")
          .attr("stroke-width", 0.8).attr("opacity", 0.55);
      }
    }

    // Riket-linje (streckad, mörkare grå)
    if (riketPts.length > 1) {
      svg.append("path").datum(riketPts)
        .attr("d", d3.line<typeof riketPts[0]>()
          .x((d) => x(d.d)).y((d) => y(d.v)).curve(d3.curveMonotoneX))
        .attr("fill", "none").attr("stroke", "#888")
        .attr("stroke-width", 1.5).attr("stroke-dasharray", "5,3")
        .attr("opacity", 0.7);
    }

    // Referenslinje (föregående år)
    if (refPts.length > 1 && !hasKontext) {
      svg.append("path").datum(refPts)
        .attr("d", d3.line<typeof refPts[0]>()
          .x((d) => x(d.d)).y((d) => y(d.v)).curve(d3.curveMonotoneX))
        .attr("fill", "none").attr("stroke", "#bbb")
        .attr("stroke-width", 1.2).attr("stroke-dasharray", "4,3")
        .attr("opacity", 0.6);
    }

    // Prediktionsband
    const bandPts = pts.filter((p) => p.lo != null);
    if (bandPts.length > 0) {
      svg.append("path").datum(bandPts)
        .attr("d", d3.area<typeof pts[0]>()
          .x((d) => x(d.d)).y0((d) => y(d.lo!)).y1((d) => y(d.hi!))
          .curve(d3.curveMonotoneX))
        .attr("fill", accent).attr("opacity", 0.10);
    }

    // Linje — tunnare vid dagsnivå (många punkter)
    const dense = pts.length > 60;
    svg.append("path").datum(pts)
      .attr("d", d3.line<typeof pts[0]>().x((d) => x(d.d)).y((d) => y(d.v)).curve(d3.curveMonotoneX))
      .attr("fill", "none").attr("stroke", accent)
      .attr("stroke-width", dense ? 1.0 : 1.8)
      .attr("stroke-linejoin", "round").attr("stroke-linecap", "round");

    // Sista punkt — mindre vid tät data
    const lastSig = last.signal;
    const dotCol = lastSig ? (SIGNAL[lastSig]?.color || accent) : accent;
    svg.append("circle")
      .attr("cx", x(last.d)).attr("cy", y(last.v))
      .attr("r", dense ? 2.5 : 3.5).attr("fill", dotCol)
      .attr("stroke", "#fff").attr("stroke-width", dense ? 1.5 : 2);

    // ── Hover: crosshair + tooltip (position:fixed) ──
    const hoverLine = svg.append("line")
      .attr("y1", mg.t).attr("y2", H - mg.b)
      .attr("stroke", "#ccc").attr("stroke-width", 0.7).attr("stroke-dasharray", "3,3")
      .style("display", "none");
    const hoverDot = svg.append("circle")
      .attr("r", 3.5).attr("fill", "#fff").attr("stroke", accent).attr("stroke-width", 1.5)
      .style("display", "none");

    const tooltipNode = document.createElement("div");
    tooltipNode.style.cssText = "position:fixed;pointer-events:none;z-index:9999;display:none";
    document.body.appendChild(tooltipNode);
    const tooltip = d3.select(tooltipNode);

    const dec = kpi.enhet === "procent" ? 1 : 0;
    const sfx = fmtSuffix(kpi.enhet);
    const bisect = d3.bisector<typeof pts[0], Date>((d) => d.d).left;

    svg.append("rect")
      .attr("x", mg.l).attr("y", mg.t)
      .attr("width", width - mg.l - mg.r).attr("height", H - mg.t - mg.b)
      .attr("fill", "transparent").style("cursor", "crosshair")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const date = x.invert(mx);
        const idx = Math.min(bisect(pts, date), pts.length - 1);
        const pt = pts[idx];
        if (!pt) return;

        hoverLine.attr("x1", x(pt.d)).attr("x2", x(pt.d)).style("display", null);
        const hCol = pt.signal ? (SIGNAL[pt.signal]?.color || accent) : accent;
        hoverDot.attr("cx", x(pt.d)).attr("cy", y(pt.v)).attr("stroke", hCol).style("display", null);

        const label = fullEtikett(pt.etikett, pt.period, vy);
        const fv = fmtVarde(pt.v, kpi.enhet, dec) + sfx;
        const SIGLAB: Record<string, string> = { gron: "I fas", gul: "Bevaka", rod: "Avvikelse" };

        let rows = `<div style="font-family:${FONT};font-size:11px;font-weight:500;color:#555;
                      margin-bottom:5px;padding-bottom:4px;border-bottom:1px solid #f0f0f0">${label}</div>
          <div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:2px">
            <span style="font-family:${FONT};font-size:10px;color:#888">Faktiskt</span>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#0a0a0a">${fv}</span>
          </div>`;
        {
          const yhatPt = kpi.tidsserie[idx];
          if (yhatPt?.yhat != null) {
            const yhatLabel = kpi.kontext_serier ? "Riket" : "Förväntat";
            rows += `<div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:2px">
              <span style="font-family:${FONT};font-size:10px;color:#888">${yhatLabel}</span>
              <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;color:#888">${fmtVarde(yhatPt.yhat, kpi.enhet, dec)}${sfx}</span>
            </div>`;
          }
        }
        if (pt.signal) {
          const sc = SIGNAL[pt.signal]?.color || "#888";
          const sl = SIGLAB[pt.signal] || "";
          rows += `<div style="display:flex;justify-content:space-between;align-items:center;gap:14px">
            <span style="font-family:${FONT};font-size:10px;color:#888">Status</span>
            <span style="display:flex;align-items:center;gap:3px">
              <span style="width:5px;height:5px;border-radius:50%;background:${sc}"></span>
              <span style="font-family:${FONT};font-size:10px;font-weight:500;color:${sc}">${sl}</span>
            </span>
          </div>`;
        }

        const rect = el.getBoundingClientRect();
        tooltip.style("display", null)
          .style("left", `${rect.left + x(pt.d)}px`)
          .style("top", `${rect.top + y(pt.v) - 10}px`)
          .style("transform", "translate(-50%, -100%)")
          .html(`<div style="background:#fff;border:1px solid #e0e0e0;border-radius:7px;
                   padding:7px 11px;box-shadow:0 3px 12px rgba(0,0,0,0.10);
                   white-space:nowrap;min-width:120px">${rows}</div>`);
      })
      .on("mouseleave", () => {
        hoverLine.style("display", "none");
        hoverDot.style("display", "none");
        tooltip.style("display", "none");
      });

    return () => { tooltipNode.remove(); };
  }, [kpi, width, vy, accent]);

  return <div ref={ref} style={{ width: "100%", height: 90 }} />;
}

// ════════════════════════════════════════════
//  SubCard
// ════════════════════════════════════════════

function SubCard({ sub, enhet, inverterad, onOpenChart, vy: _vy, kpiNamn }: {
  sub: SubKpi; enhet: string; inverterad: boolean;
  onOpenChart?: (kpi: KpiData) => void; vy?: string; kpiNamn?: string;
}) {
  const last = sub.tidsserie[sub.tidsserie.length - 1];
  const sig = last?.signal ? SIGNAL[last.signal] : null;
  const accent = sig?.color || NEUTRAL.color;
  const dec = enhet === "procent" ? 1 : 0;
  const suffix = fmtSuffix(enhet);

  const fullNamn = kpiNamn ? `${kpiNamn}, ${sub.namn}` : sub.namn;
  const asKpi: KpiData = {
    id: sub.id, namn: fullNamn, enhet: enhet as KpiData["enhet"],
    inverterad, senaste: sub.senaste, forandring: sub.forandring,
    forandringar: [], status: sub.status, analystext: "", tidsserie: sub.tidsserie,
    dagar: sub.dagar,
  };

  return (
    <div
      onClick={() => onOpenChart?.(asKpi)}
      style={{
        background: "#fff", border: "1px solid #e5e5e5", borderLeft: `2px solid ${accent}`,
        borderRadius: 4, padding: "8px 10px", fontFamily: FONT,
        cursor: "pointer", transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 500, color: "#555", lineHeight: 1.2 }}>{sub.namn}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ ...mono, fontSize: 15, fontWeight: 600, color: "#0a0a0a", letterSpacing: "-0.02em" }}>
          {fmtVarde(sub.senaste, enhet, dec)}{suffix}
        </span>
        {last?.yhat != null && (
          <span style={{ fontSize: 10, color: "#999" }}>
            förv. {fmtVarde(last.yhat, enhet, dec)}{suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  KPI CARD — omstrukturerad
// ════════════════════════════════════════════

interface KpiCardProps {
  kpi: KpiData;
  vyData: VyData;
  onOpenChart?: (kpi: KpiData) => void;
  visaDagar?: boolean;
}

export default function KpiCard({ kpi, vyData, onOpenChart, visaDagar }: KpiCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Välj data: dagar (dagsnivå för aktuell period) eller aggregerad tidsserie
  const aktivSerie = visaDagar && kpi.dagar && kpi.dagar.length > 0
    ? kpi.dagar : kpi.tidsserie;
  const aktivVy = visaDagar && kpi.dagar && kpi.dagar.length > 0
    ? "dag" : vyData.vy;

  const last = aktivSerie[aktivSerie.length - 1];
  const sig = last?.signal ? SIGNAL[last.signal] : null;
  const accent = sig?.color || NEUTRAL.color;
  const sigLabel = sig?.label || "";
  const sigBg = sig?.bg || NEUTRAL.bg;

  const dec = kpi.enhet === "procent" ? 1 : 0;
  const suffix = fmtSuffix(kpi.enhet);
  const hasUnder = kpi.undernivaer && kpi.undernivaer.length > 0;
  const ds = kpi.dagar_sammanfattning;

  return (
    <div style={{
      background: "#fff", border: "1px solid #e0e0dc", borderRadius: 8,
      fontFamily: FONT, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      transition: "box-shadow 0.15s", overflow: "hidden",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
    >
      {/* ── Signalband topp ── */}
      <div style={{ height: 3, background: accent }} />

      <div style={{ padding: "12px 14px 10px" }}>

        {/* ── Rad 1: Titel + öppna graf ── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TitleWithTooltip
              title={kpi.namn}
              description={kpi.beskrivning || DEFINITIONS[kpi.id]}
            />
            <div style={{ fontSize: 10.5, color: "#999", marginTop: 2, lineHeight: 1.2 }}>
              {vyData.period}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenChart?.(kpi); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: 4, color: "#c0c0c0", lineHeight: 1, transition: "color 0.15s", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 4, width: 24, height: 24,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#555"; e.currentTarget.style.background = "#f5f5f5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#c0c0c0"; e.currentTarget.style.background = "none"; }}
            title="Visa stor graf"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1,12 5,6 9,9 15,3" />
              <polyline points="11,3 15,3 15,7" />
            </svg>
          </button>
        </div>

        {/* ── Rad 2: Hero-värde ── */}
        <div style={{ marginBottom: 6 }}>
          <span style={{ ...mono, fontSize: 28, fontWeight: 700, color: "#0a0a0a", lineHeight: 1, letterSpacing: "-0.03em" }}>
            {fmtVarde(kpi.senaste, kpi.enhet, dec)}
          </span>
          <span style={{ ...mono, fontSize: 14, fontWeight: 500, color: "#888", marginLeft: 2 }}>
            {suffix}
          </span>
        </div>

        {/* ── Rad 3: Förväntat + signal (dölj "Förväntat" för NPE/kontext) ── */}
        {last?.yhat != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {!kpi.kontext_serier && (
              <span style={{ fontSize: 11, color: "#777" }}>
                Förväntat{" "}
                <span style={{ ...mono, fontWeight: 500, fontSize: 11.5, color: "#555" }}>
                  {fmtVarde(last.yhat, kpi.enhet, dec)}{suffix}
                </span>
                {last.yhat_lower != null && last.yhat_upper != null && (
                  <span style={{ color: "#bbb", marginLeft: 3, fontSize: 10 }}>
                    ({fmtVarde(last.yhat_lower, kpi.enhet, dec)}–{fmtVarde(last.yhat_upper, kpi.enhet, dec)})
                  </span>
                )}
              </span>
            )}
            {sigLabel && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: sigBg, padding: "2px 7px", borderRadius: 4,
                fontSize: 10, fontWeight: 600, color: accent,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: accent }} />
                {sigLabel}
              </span>
            )}
          </div>
        )}

        {/* ── Rad 4: Minigraf med axlar ── */}
        {aktivSerie.length > 1 && (
          <MiniChart kpi={{ ...kpi, tidsserie: aktivSerie }} vy={aktivVy} accent={accent} />
        )}

        {/* ── Rad 5: Dagsammanfattning (vid dag-toggle) ── */}
        {visaDagar && ds && (
          <div style={{
            display: "flex", gap: 8, alignItems: "center",
            marginTop: 6, padding: "5px 8px",
            background: "#f8f9f8", borderRadius: 5,
            fontSize: 10.5, color: "#666",
          }}>
            <span>
              <span style={{ ...mono, fontWeight: 600, color: "#16a34a" }}>{ds.n_i_fas}</span>
              <span style={{ color: "#999" }}>/{ds.n_dagar}</span>
              {" "}i fas
            </span>
            {(ds.n_bevaka ?? 0) > 0 && (
              <>
                <span style={{ width: 1, height: 12, background: "#e0e0e0" }} />
                <span>
                  <span style={{ ...mono, fontWeight: 600, color: "#ea980c" }}>{ds.n_bevaka}</span>
                  {" "}bevaka
                </span>
              </>
            )}
            {ds.n_avvikelse > 0 && (
              <>
                <span style={{ width: 1, height: 12, background: "#e0e0e0" }} />
                <span>
                  <span style={{ ...mono, fontWeight: 600, color: "#dc2626" }}>{ds.n_avvikelse}</span>
                  {" "}avvikelse
                </span>
              </>
            )}
          </div>
        )}

        {/* ── Rad 6: Referens mot föregående år ── */}
        {kpi.referens && (
          <div style={{
            marginTop: 5, fontSize: 10.5, color: "#888", lineHeight: 1.4,
          }}>
            <span style={{ color: "#aaa" }}>vs {kpi.referens.etikett}: </span>
            <span style={{ ...mono, fontWeight: 500, fontSize: 10.5, color: "#555" }}>
              {fmtVarde(kpi.referens.varde, kpi.enhet, dec)}{suffix}
            </span>
            {kpi.referens.forandring !== 0 && (
              <span style={{
                ...mono, fontWeight: 600, fontSize: 10.5, marginLeft: 4,
                color: kpi.referens.forandring > 0
                  ? (kpi.inverterad ? "#dc2626" : "#16a34a")
                  : (kpi.inverterad ? "#16a34a" : "#dc2626"),
              }}>
                {kpi.referens.forandring > 0 ? "+" : ""}{fmtVarde(kpi.referens.forandring, kpi.enhet, dec)}{suffix}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Undernivaer ── */}
      {hasUnder && (
        <div style={{ padding: "0 14px 10px", borderTop: "1px solid #f0f0f0" }}>
          <button onClick={() => setExpanded(!expanded)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "8px 0 4px", fontFamily: FONT, fontSize: 11.5, fontWeight: 500,
              color: "#888", display: "inline-flex", alignItems: "center", gap: 5,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#555"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#888"; }}
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: "transform 0.2s", transform: expanded ? "rotate(90deg)" : "rotate(0)" }}>
              <polyline points="3,1.5 7,5 3,8.5" />
            </svg>
            {kpi.undernivaer!.length} avdelningar
          </button>
          {expanded && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginTop: 4 }}>
              {kpi.undernivaer!.map((sub) => (
                <SubCard key={sub.id} sub={sub} enhet={kpi.enhet} inverterad={kpi.inverterad} onOpenChart={onOpenChart} vy={vyData.vy} kpiNamn={kpi.namn} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
