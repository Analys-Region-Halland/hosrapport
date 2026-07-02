import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { KpiData, VyData } from "../types";
import { fmtSuffix } from "../utils/format";
import { tidsserie, parseTidsserie, parseSimpleSerie } from "../charts/tidsserie";
import type { TidsserieSeries } from "../charts/types";
import { FONT, FONT_TITEL, NEUTRAL_LINE } from "../charts/constants";
import SegmentedControl from "./SegmentedControl";
import { kortBeskrivning } from "../utils/definitions";
import { StatusTag } from "./SignalStrip";

interface Props {
  kpi: KpiData;
  vyData: VyData;
  visaDagar?: boolean;
  onClose: () => void;
}

export default function ChartModal({ kpi, vyData, visaDagar: initialVisaDagar, onClose }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const harDagar = vyData.vy !== "dag" && kpi.dagar && kpi.dagar.length > 0;
  const [visaDagar, setVisaDagar] = useState(!!initialVisaDagar);

  const aktivVyId = visaDagar && harDagar ? "dag" : vyData.vy;
  const aktivData = visaDagar && harDagar ? kpi.dagar! : kpi.tidsserie;

  const accent = NEUTRAL_LINE;
  const dec = kpi.enhet === "procent" ? 1 : 0;
  const suffix = fmtSuffix(kpi.enhet);

  const titel = kpi.namn;
  // Undertitel: max 2 meningar. Full text bor under infoknappen (KPI-korten).
  const beskrivning = kortBeskrivning(kpi);

  // Förklaring i undertiteln av vad grafen visar
  const harBand = aktivData.some((p) => p.yhat_lower_80 != null);
  const harKontext = !!(kpi.kontext_serier && kpi.kontext_serier.length > 0);
  const bandText = harBand
    ? "Skuggat fält: förväntat intervall — inre 80 % (i fas), yttre 95 % (bevaka). Streckad linje: modellens förväntade värde."
    : harKontext
      ? "Grå linjer: övriga regioner · streckad linje: rikssnitt."
      : "";

  const undertitel = useMemo(() => {
    if (visaDagar && vyData.dagar_period) {
      return `Daglig, ${vyData.dagar_period.etikett} \u00b7 Region Halland`;
    }
    return `${vyData.etikett} \u00b7 ${vyData.period} \u00b7 Region Halland`;
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
    return () => { cleanupRef.current?.(); };
  }, []);

  // ── Rita graf via tidsserie() ──
  useEffect(() => {
    if (!chartRef.current || dims.w === 0 || aktivData.length < 2) return;
    cleanupRef.current?.();

    const { pts, band } = parseTidsserie(aktivData);
    const parse = (raw: { period: string; etikett: string; varde: number }[]) => parseSimpleSerie(raw);

    const kontextLinjer = kpi.kontext_serier
      ? kpi.kontext_serier.map((ks) => ({ namn: ks.namn, pts: parse(ks.tidsserie) }))
      : undefined;
    const riketPts = kpi.riket_serie ? parse(kpi.riket_serie) : undefined;

    const series: TidsserieSeries = {
      pts, color: accent, name: titel,
      band: band.length > 0 ? band : undefined,
      kontextLinjer, riketPts,
      malniva: kpi.malniva,
    };

    const cleanup = tidsserie(chartRef.current, series, {
      width: dims.w,
      height: dims.h,
      margins: { t: 8, r: 100, b: 36, l: 52 },
      enhet: kpi.enhet,
      vy: aktivVyId,
      showEndLabels: true,
      mainLabel: harBand ? undefined : "Halland",
      denseThreshold: 30,
      decimals: dec,
      suffix,
    });

    cleanupRef.current = cleanup;
    return cleanup;
  }, [kpi, vyData, dims, accent, dec, suffix, aktivData, aktivVyId, titel]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 14, width: "95vw", maxWidth: 1100, maxHeight: "92vh",
        overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
      }}>
        {/* ── Toolbar ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 16px", borderBottom: "1px solid #f0f0f0",
        }}>
          {harDagar ? (
            <SegmentedControl
              size="sm"
              ariaLabel="Aggregerat eller dagsnivå"
              items={[{ id: "aggregerat", label: "Aggregerat" }, { id: "dag", label: "Dag" }]}
              value={visaDagar ? "dag" : "aggregerat"}
              onChange={(id) => setVisaDagar(id === "dag")}
            />
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{
              fontFamily: FONT_TITEL, fontWeight: 600, fontSize: 22, lineHeight: 1.22,
              color: "#1a1a1a", margin: 0,
            }}>
              {titel}
            </h2>
            <StatusTag status={kpi.status} neutral={kpi.utan_mal} />
          </div>
          {beskrivning && (
            <p style={{
              fontFamily: FONT, fontWeight: 400, fontSize: 14, lineHeight: 1.5,
              color: "#444", margin: "6px 0 0", maxWidth: 620,
            }}>
              {beskrivning}
            </p>
          )}
          <p style={{
            fontFamily: FONT, fontWeight: 500, fontSize: 12, lineHeight: 1.4,
            color: "#888", margin: "4px 0 0",
          }}>
            {undertitel}
          </p>
          {bandText && (
            <p style={{
              fontFamily: FONT, fontWeight: 400, fontSize: 12, lineHeight: 1.4,
              color: "#666", margin: "6px 0 0",
            }}>
              {bandText}
            </p>
          )}
        </div>

        {/* ── Graf ── */}
        <div ref={measRef} style={{ flex: 1, padding: "6px 20px 18px", position: "relative", minHeight: 200 }}>
          <div ref={chartRef} style={{ width: "100%", height: dims.h || 300, position: "relative" }} />
        </div>
      </div>
    </div>
  );
}
