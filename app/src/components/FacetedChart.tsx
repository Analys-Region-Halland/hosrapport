import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { KpiData } from "../types";
import { fmtSuffix } from "../utils/format";
import { tidsserie, parseTidsserie, parseSimpleSerie } from "../charts/tidsserie";
import type { TidsserieSeries, Pt, BandPt, ToppBandPt } from "../charts/types";
import { FONT, NEUTRAL_LINE, SIGNAL_COLORS } from "../charts/constants";
import { useResizeWidth } from "../hooks/useResizeWidth";
import { kpiBeskrivning } from "../utils/definitions";
import { StatusTag } from "./SignalStrip";

function enhetLabel(e: string): string {
  if (e === "procent") return "Procent";
  if (e === "minuter") return "Minuter";
  if (e === "antal") return "Antal";
  return e.charAt(0).toUpperCase() + e.slice(1);
}

// ── Intern seriedata (före konvertering till TidsserieSeries) ──

interface InternalSeries {
  id: string;
  name: string;
  color: string;
  status?: string;
  pts: Pt[];
  band?: BandPt[];
  kontextPts?: { namn: string; pts: Pt[] }[];
  riketPts?: Pt[];
  toppBand?: ToppBandPt[];
}

// ════════════════════════════════════════
//  FacetedChart
// ════════════════════════════════════════

interface Props { kpi: KpiData; vy?: string }

export default function FacetedChart({ kpi, vy }: Props) {
  const [outerRef, containerWidth] = useResizeWidth();
  const [showInfo, setShowInfo] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const accent = NEUTRAL_LINE;

  const { allSeries, xDomain, yDomain } = useMemo(() => {
    const result: InternalSeries[] = [];

    const { pts: mainPts, band: mainBand } = parseTidsserie(kpi.tidsserie);

    const kontextPts = kpi.kontext_serier
      ? kpi.kontext_serier.map((ks) => ({ namn: ks.namn, pts: parseSimpleSerie(ks.tidsserie) }))
      : undefined;
    const riketPts = kpi.riket_serie ? parseSimpleSerie(kpi.riket_serie) : undefined;
    const parseDate = d3.timeParse("%Y-%m-%d");
    const toppBand = kpi.topp3_band
      ? kpi.topp3_band
          .map((b) => ({ d: parseDate(b.period)!, lo: b.lo, hi: b.hi }))
          .filter((b) => b.d)
      : undefined;

    result.push({
      id: kpi.id, name: "Totalt", color: accent, status: kpi.status,
      pts: mainPts, band: mainBand.length > 0 ? mainBand : undefined,
      kontextPts, riketPts, toppBand,
    });

    if (kpi.undernivaer) {
      kpi.undernivaer.forEach((sub) => {
        const { pts: subPts, band: subBand } = parseTidsserie(sub.tidsserie);
        result.push({
          id: sub.id, name: sub.namn, status: sub.status,
          color: accent, // enhetlig färg som storgrafen — ingen regnbåge
          pts: subPts, band: subBand.length > 0 ? subBand : undefined,
        });
      });
    }

    const allDates = result.flatMap((s) => s.pts.map((p) => p.d));
    const xd = d3.extent(allDates) as [Date, Date];

    // Delad y-skala för procent → alla paneler får samma spann och blir
    // jämförbara. MÅSTE inkludera kontext- och riketserier, annars klipps
    // övriga regioners linjer vid Hallands min/max.
    let yd: [number, number] | undefined;
    if (kpi.enhet === "procent") {
      const vals = result.flatMap((s) => [
        ...s.pts.map((p) => p.v),
        ...(s.band || []).flatMap((b) => [b.lo, b.hi]),
        ...(s.kontextPts || []).flatMap((k) => k.pts.map((p) => p.v)),
        ...(s.riketPts || []).map((p) => p.v),
        ...(s.toppBand || []).flatMap((b) => [b.lo, b.hi]),
      ]);
      const [mn, mx] = d3.extent(vals) as [number, number];
      if (mn != null && mx != null) {
        const pad = (mx - mn) * 0.1 || 1;
        yd = [mn - pad, mx + pad];
      }
    }
    return { allSeries: result, xDomain: xd, yDomain: yd };
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

  const toChartSeries = (s: InternalSeries): TidsserieSeries => ({
    pts: s.pts, color: s.color, name: s.name,
    band: s.band, kontextLinjer: s.kontextPts, riketPts: s.riketPts,
    toppBand: s.toppBand,
    // Rankingindikatorer: senaste punkten signalfärgas (grön när i fas/topp 3)
    lastColor: s.kontextPts?.length && s.status ? SIGNAL_COLORS[s.status] : undefined,
    // Målnivå hör till totalen (huvudlinjen), inte avdelningspanelerna.
    malniva: s.id === kpi.id ? kpi.malniva : undefined,
  });

  return (
    <div ref={outerRef} style={{ width: "100%" }}>

      {/* ── Diagram ── */}
      {expandedSeries ? (
        <>
          <div style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            marginBottom: 12, gap: 8,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: 18, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.3,
                }}>
                  {kpi.namn}{expandedSeries.name !== "Totalt" ? `, ${expandedSeries.name}` : ""}
                </div>
                {expandedSeries.status && <StatusTag status={expandedSeries.status} />}
              </div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: "#555", marginTop: 4 }}>
                {kpiBeskrivning(kpi) || `${enhetLabel(kpi.enhet)} · ${fmtPeriodRange()}`}
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
            series={toChartSeries(expandedSeries)}
            xDomain={xDomain}
            yDomain={yDomain}
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
          <div style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            marginBottom: 12, gap: 8,
          }}>
            <div>
              <h4 style={{
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: 16, fontWeight: 600, color: "#1a1a1a",
                letterSpacing: "-0.01em", lineHeight: 1.3, margin: "0 0 3px",
              }}>
                Nedbrytning per avdelning
              </h4>
              <div style={{ fontFamily: FONT, fontSize: 12.5, color: "#666", lineHeight: 1.4 }}>
                {kpiBeskrivning(kpi) || `${enhetLabel(kpi.enhet)} · ${fmtPeriodRange()}`}
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
          <div style={{ fontFamily: FONT, fontSize: 11, color: "#aaa", marginBottom: 10 }}>
            Klicka på en panel för storformat.
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
              className="facet-panel"
              onClick={() => setExpandedId(s.id)}
              title={`Förstora: ${s.name}`}
              role="button"
              aria-label={`Förstora graf: ${s.name}`}
              style={{ cursor: "pointer", position: "relative", padding: 4, borderRadius: 6 }}
            >
              <span className="facet-expand" aria-hidden="true" style={{
                position: "absolute", top: 6, right: 6, width: 18, height: 18, zIndex: 1,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                borderRadius: 4, background: "#fff", border: "1px solid #e0e0dc", color: "#83888A",
              }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.5 2.5H13.5V6.5" /><path d="M13.5 2.5L9 7" />
                  <path d="M6.5 13.5H2.5V9.5" /><path d="M2.5 13.5L7 9" />
                </svg>
              </span>
              <Panel
                series={toChartSeries(s)}
                status={s.status}
                xDomain={xDomain}
                yDomain={yDomain}
                yTickCount={4}
                width={panelW - 8}
                enhet={kpi.enhet}
                dec={dec}
                suffix={suffix}
                vy={vy}
              />
            </div>
          ))}
          </div>
        </div>
      ) : (
        <div>
          {/* Rubrikblock — titel + beskrivning + Info, som de facetterade graferna */}
          <div style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            marginBottom: 12, gap: 8,
          }}>
            <div>
              <h4 style={{
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: 16, fontWeight: 600, color: "#1a1a1a",
                letterSpacing: "-0.01em", lineHeight: 1.3, margin: "0 0 3px",
              }}>
                Utveckling över tid
              </h4>
              <div style={{ fontFamily: FONT, fontSize: 12.5, color: "#666", lineHeight: 1.4 }}>
                {kpiBeskrivning(kpi) || `${enhetLabel(kpi.enhet)} · ${fmtPeriodRange()}`}
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
          <Panel
            series={toChartSeries(allSeries[0])}
            xDomain={xDomain}
            yDomain={yDomain}
            width={containerWidth}
            enhet={kpi.enhet}
            dec={dec}
            suffix={suffix}
            isSingle
            showEndLabels
            mainLabel="Halland"
          />
        </div>
      )}
    </div>
  );
}

// ═���════════════════��═════════════════════
//  InfoPopover
// ��═══════════���═══════════════════════════

function InfoPopover({ kpi, onClose }: { kpi: KpiData; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const enhet = kpi.enhet === "procent" ? "Procent"
    : kpi.enhet === "minuter" ? "Minuter" : "Antal";

  return (
    <div ref={ref} style={{
      position: "absolute", top: "100%", left: 0, marginTop: 6, width: 300,
      background: "#fff", border: "1px solid #e0e0dc", borderRadius: 10,
      padding: "14px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", zIndex: 20, fontFamily: FONT,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>{kpi.namn}</div>
      {kpi.beskrivning && (
        <div style={{ fontSize: 12, lineHeight: 1.6, color: "#555", marginBottom: 10 }}>{kpi.beskrivning}</div>
      )}
      <div style={{
        display: "flex", gap: 12, fontSize: 11, color: "#888",
        borderTop: "1px solid #f0f0ee", paddingTop: 8,
      }}>
        <span>Enhet: <strong style={{ color: "#555" }}>{enhet}</strong></span>
        <span>Riktning: <strong style={{ color: "#555" }}>{kpi.inverterad ? "Lagre ar battre" : "Hogre ar battre"}</strong></span>
      </div>
      {kpi.undernivaer && (
        <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
          Nedbrytning: {kpi.undernivaer.map((s) => s.namn).join(", ")}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
//  Panel — tunn wrapper kring tidsserie()
// ════════════════════════════════════════

interface PanelProps {
  series: TidsserieSeries;
  xDomain: [Date, Date];
  yDomain?: [number, number];
  yTickCount?: number;
  width: number;
  enhet: string;
  dec: number;
  suffix: string;
  isSingle?: boolean;
  vy?: string;
  /** Statustagg på just denna panel (kan variera mellan paneler) */
  status?: string;
  /** Slutetiketter à la storgrafen (kopplingslinjer + kollisionshantering) */
  showEndLabels?: boolean;
  /** Etikett för huvudlinjen i slutetiketterna (t.ex. "Halland") */
  mainLabel?: string;
}

function Panel({ series, xDomain, yDomain, yTickCount, width, enhet, dec, suffix, isSingle = false, vy, status, showEndLabels = false, mainLabel }: PanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || width === 0) return;
    cleanupRef.current?.();

    const h = isSingle
      ? Math.max(200, Math.round(width * 0.55))
      : Math.round(width * 0.6);

    const cleanup = tidsserie(el, series, {
      width,
      height: h,
      margins: isSingle
        // Bredare högermarginal när regionetiketter (högsta/lägsta) ska få plats
        ? { t: 16, r: showEndLabels ? (series.kontextLinjer?.length ? 136 : 96) : 20, b: 34, l: 48 }
        : { t: 12, r: 8, b: 28, l: 38 },
      enhet,
      vy,
      xDomain,
      yDomain,
      yTickCount,
      showBrackets: true,
      showEndLabels,
      mainLabel,
      compact: !isSingle ? true : false,
      denseThreshold: 30,
      decimals: dec,
      suffix,
    });

    cleanupRef.current = cleanup;
    return cleanup;
  }, [series, xDomain, yDomain, yTickCount, width, enhet, dec, suffix, isSingle, vy, showEndLabels, mainLabel]);

  // Panelhuvud: namn (för facets) + statustagg — direkt vid grafen.
  const showHeader = (!isSingle && series.name) || status;
  return (
    <div style={{ position: "relative" }}>
      {showHeader && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          justifyContent: "flex-start",
          marginBottom: 4, paddingLeft: 2, paddingRight: 24, minHeight: 16,
        }}>
          {!isSingle && series.name && (
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: "#444" }}>{series.name}</span>
          )}
          {status && <StatusTag status={status} size={isSingle ? "md" : "sm"} />}
        </div>
      )}
      <div ref={ref} />
    </div>
  );
}
