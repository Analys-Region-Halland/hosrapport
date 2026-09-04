import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { KpiData } from "../types";
import { fmtSuffix } from "../utils/format";
import { tidsserie, parseTidsserie, parseSimpleSerie } from "../charts/tidsserie";
import type { TidsserieSeries, Pt, BandPt, ToppBandPt } from "../charts/types";
import { FONT, HALLAND_LINE, SIGNAL_COLORS, pinColor } from "../charts/constants";
import { useResizeWidth } from "../hooks/useResizeWidth";
import { kortBeskrivning } from "../utils/definitions";
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

interface Props {
  kpi: KpiData;
  vy?: string;
  /** Rubrikblocket över grafen. Kan stängas av helt, men normalt vill man
   *  i stället skriva om det med `rubrik`/`underrubrik` nedan. */
  visaRubrik?: boolean;
  /** Egen diagramrubrik. Utan den används indikatornamnet, vilket är rätt
   *  när grafen står ensam (ChartModal) men en upprepning i rapporten, där
   *  namnet redan står i indikatorhuvudet. Skriv i stället vad grafen VISAR,
   *  t.ex. "Halland mot samtliga regioner". */
  rubrik?: string;
  /** Egen undertext: enhet, period och hur serierna ska läsas. */
  underrubrik?: string;
  /** Kontroll som står i rubrikraden bredvid Info-knappen (t.ex. Aggregerat/Dag). */
  verktyg?: React.ReactNode;
  /** Regioner som är fästa från start (provbänk/tester). */
  initialPinned?: string[];
}

export default function FacetedChart({
  kpi, vy, visaRubrik = true, rubrik, underrubrik, verktyg, initialPinned,
}: Props) {
  const [outerRef, containerWidth] = useResizeWidth();
  const [showInfo, setShowInfo] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Regioner som läsaren fäst med klick i storgrafen. Listan bär indikatorns
  // id, så att en annan indikator i samma komponent börjar tom (härledning i
  // stället för en nollställande effekt).
  const [pinnedFor, setPinnedFor] = useState<{ id: string; list: string[] }>({ id: kpi.id, list: initialPinned ?? [] });
  const pinned = pinnedFor.id === kpi.id ? pinnedFor.list : [];
  const kpiId = kpi.id;
  const togglePin = useCallback((namn: string) => {
    setPinnedFor((prev) => {
      const list = prev.id === kpiId ? prev.list : [];
      return { id: kpiId, list: list.includes(namn) ? list.filter((n) => n !== namn) : [...list, namn] };
    });
  }, [kpiId]);
  const setPinned = useCallback((list: string[]) => setPinnedFor({ id: kpiId, list }), [kpiId]);

  const accent = HALLAND_LINE;

  const { allSeries, xDomain, yDomain } = useMemo(() => {
    const result: InternalSeries[] = [];

    const { pts: mainPts, band: mainBand } = parseTidsserie(kpi.tidsserie);

    // Bryt jämförelseserierna vid sista perioden med Halland-data, annars
    // sträcker sig regioner med nyare data förbi x-axeln (och blåser upp y-skalan).
    const hallandMax = mainPts.length ? +mainPts[mainPts.length - 1].d : Infinity;
    const inomX = (p: { d: Date }) => +p.d <= hallandMax;

    const kontextPts = kpi.kontext_serier
      ? kpi.kontext_serier.map((ks) => ({ namn: ks.namn, pts: parseSimpleSerie(ks.tidsserie).filter(inomX) }))
      : undefined;
    const riketPts = kpi.riket_serie ? parseSimpleSerie(kpi.riket_serie).filter(inomX) : undefined;
    const parseDate = d3.timeParse("%Y-%m-%d");
    const toppBand = kpi.topp3_band
      ? kpi.topp3_band
          .map((b) => ({ d: parseDate(b.period)!, lo: b.lo, hi: b.hi }))
          .filter((b) => b.d && inomX(b))
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
      // Ingen padding här: tidsserie() omsluter domänen med gridlinjer, och
      // en padding hade bara tryckt ut ännu en (tom) linje över och under.
      if (mn != null && mx != null) yd = [mn, mx];
    }
    return { allSeries: result, xDomain: xd, yDomain: yd };
  }, [kpi, accent]);

  const expandedSeries = expandedId ? allSeries.find(s => s.id === expandedId) : null;

  if (containerWidth === 0) {
    return <div ref={outerRef} style={{ width: "100%" }} />;
  }

  const hasFacets = allSeries.length > 1;
  const harKontext = !!(kpi.kontext_serier && kpi.kontext_serier.length > 0);
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
                <h4 className="graf-rubrik" style={{ margin: 0 }}>
                  {kpi.namn}{expandedSeries.name !== "Totalt" ? `, ${expandedSeries.name}` : ""}
                </h4>
                {expandedSeries.status && <StatusTag status={expandedSeries.status} neutral={kpi.utan_mal} />}
              </div>
              <div className="graf-underrubrik" style={{ marginTop: 4 }}>
                {kortBeskrivning(kpi) || `${enhetLabel(kpi.enhet)} · ${fmtPeriodRange()}`}
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
              <h4 className="graf-rubrik">{rubrik ?? "Nedbrytning per avdelning"}</h4>
              <div className="graf-underrubrik">
                {underrubrik
                  || kortBeskrivning(kpi)
                  || `${enhetLabel(kpi.enhet)} · ${fmtPeriodRange()}`}
              </div>
            </div>
            <div style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
              {verktyg}
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
            {visaRubrik ? (
              <div>
                <h4 className="graf-rubrik">
                  {rubrik ?? (
                    <>
                      <span style={{ color: "#9a9a95", fontWeight: 500 }}>Diagram: </span>
                      {kpi.namn}
                    </>
                  )}
                </h4>
                <div className="graf-underrubrik">
                  {underrubrik
                    || kortBeskrivning(kpi)
                    || `${enhetLabel(kpi.enhet)} · ${fmtPeriodRange()}`}
                </div>
              </div>
            ) : <div />}
            <div style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
              {verktyg}
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
            vy={vy}
            inverterad={kpi.inverterad}
            kalla={kpi.kalla?.namn}
            pinned={pinned}
            onTogglePin={togglePin}
          />
          {harKontext && (
            <GrafFot pinned={pinned} onRemove={togglePin} onClear={() => setPinned([])} />
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
//  GrafFot — läsanvisning + fästa regioner (chip per region, färg = linjen)
// ════════════════════════════════════════

function GrafFot({ pinned, onRemove, onClear }: {
  pinned: string[]; onRemove: (namn: string) => void; onClear: () => void;
}) {
  if (pinned.length === 0) {
    return (
      <div className="graf-fot">
        <span className="graf-fot__tips">Klicka på en grå linje för att markera regionen och följa den i grafen.</span>
      </div>
    );
  }
  return (
    <div className="graf-fot" role="group" aria-label="Markerade regioner">
      <span>Markerade:</span>
      {pinned.map((namn, i) => (
        <button
          key={namn} type="button" className="graf-markering"
          onClick={() => onRemove(namn)} title={`Ta bort ${namn}`}
          aria-label={`Ta bort markeringen av ${namn}`}
        >
          <span className="graf-markering__prick" style={{ background: pinColor(i) }} />
          {namn}
          <span className="graf-markering__x" aria-hidden="true">×</span>
        </button>
      ))}
      {pinned.length > 1 && (
        <button type="button" className="graf-fot__rensa" onClick={onClear}>Rensa alla</button>
      )}
    </div>
  );
}

// ════════════════════════════════════════
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
  inverterad?: boolean;
  kalla?: string;
  pinned?: string[];
  onTogglePin?: (namn: string) => void;
}

function Panel({
  series, xDomain, yDomain, yTickCount, width, enhet, dec, suffix,
  isSingle = false, vy, status, showEndLabels = false, mainLabel,
  inverterad, kalla, pinned, onTogglePin,
}: PanelProps) {
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
      // Högermarginalen växer automatiskt i tidsserie() så att slutetiketterna
      // ryms; värdet här är golvet. Det lilla golvet i facetpanelerna rymmer
      // halva sista årtalet under tickmarken vid plotkanten.
      margins: isSingle
        ? { t: 16, r: showEndLabels ? 96 : 20, b: 34, l: 44 }
        : { t: 12, r: 18, b: 28, l: 36 },
      enhet,
      vy,
      xDomain,
      yDomain,
      yTickCount,
      showEndLabels,
      mainLabel,
      compact: !isSingle ? true : false,
      denseThreshold: 30,
      decimals: dec,
      suffix,
      inverterad,
      kalla,
      pinned,
      onTogglePin,
    });

    cleanupRef.current = cleanup;
    return cleanup;
  }, [series, xDomain, yDomain, yTickCount, width, enhet, dec, suffix, isSingle, vy, showEndLabels, mainLabel, inverterad, kalla, pinned, onTogglePin]);

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
