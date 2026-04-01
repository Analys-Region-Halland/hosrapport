import { useState, useRef, useCallback } from "react";
import type { TidsseriePoint } from "../types";

const mono: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontFeatureSettings: "'tnum'",
  fontVariantNumeric: "tabular-nums",
};

const SIGNAL_COLORS: Record<string, string> = {
  gron: "#16a34a",
  gul: "#ea980c",
  rod: "#dc2626",
};

const SIGNAL_LABELS: Record<string, string> = {
  gron: "I fas",
  gul: "Bevaka",
  rod: "Avvikelse",
};

/** Bygg etikett med år — lägger till år om det saknas */
function fullEtikett(etikett: string, period: string, vy?: string): string {
  const year = period.slice(0, 4);
  if (vy === "dag") return `${etikett} ${year}`;
  if (vy === "vecka") return `${etikett}, ${year}`;
  return etikett; // manad/kvartal/ar har redan år i etiketten
}

interface Props {
  data: number[];
  color?: string;
  height?: number;
  labels?: string[];
  unit?: string;
  decimals?: number;
  /** Full tidsserie med prediktionsdata */
  tsData?: TidsseriePoint[];
  /** Aktiv vy — för år-kontext i tooltip */
  vy?: string;
}

export default function Sparkline({ data, color = "#2563eb", height = 48, labels = [], unit = "", decimals = 0, tsData, vy }: Props) {
  if (!data || data.length < 2) return null;
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ pctX: number; pctY: number; idx: number; value: number } | null>(null);

  const hasBand = tsData && tsData.some((d) => d.yhat != null);

  // Beräkna min/max inklusive band om det finns
  let min = Math.min(...data);
  let max = Math.max(...data);
  if (hasBand && tsData) {
    const lows = tsData.map((d) => d.yhat_lower ?? d.varde).filter((v) => v != null);
    const highs = tsData.map((d) => d.yhat_upper ?? d.varde).filter((v) => v != null);
    min = Math.min(min, ...lows);
    max = Math.max(max, ...highs);
  }

  const range = max - min || 1;
  const py = 5;
  const px = 5;
  const h = height - py * 2;
  const w = 120;

  const toY = (v: number) => py + h - ((v - min) / range) * h;
  const toX = (i: number) => px + (i / (data.length - 1)) * (w - px * 2);

  const points = data.map((v, i) => ({ x: toX(i), y: toY(v), value: v }));
  const pts = points.map((p) => `${p.x},${p.y}`);

  // Prediktionsband (95 % yttre, 80 % inre)
  let band95Path = "";
  let band80Path = "";
  if (hasBand && tsData) {
    const upper95 = tsData.map((d, i) => `${toX(i)},${toY(d.yhat_upper ?? d.varde)}`);
    const lower95 = tsData.map((d, i) => `${toX(i)},${toY(d.yhat_lower ?? d.varde)}`).reverse();
    band95Path = [...upper95, ...lower95].join(" ");
    const upper80 = tsData.map((d, i) => `${toX(i)},${toY(d.yhat_upper_80 ?? d.yhat_upper ?? d.varde)}`);
    const lower80 = tsData.map((d, i) => `${toX(i)},${toY(d.yhat_lower_80 ?? d.yhat_lower ?? d.varde)}`).reverse();
    band80Path = [...upper80, ...lower80].join(" ");
  }

  // Sista punkten
  const lastPt = points[points.length - 1];
  const lastPctX = (lastPt.x / w) * 100;
  const lastPctY = (lastPt.y / height) * 100;
  const lastSignal = tsData?.[tsData.length - 1]?.signal;
  const lastColor = lastSignal ? (SIGNAL_COLORS[lastSignal] || color) : color;

  const handleMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const relX = (e.clientX - rect.left) / rect.width;
      const idx = Math.max(0, Math.min(data.length - 1, Math.round(relX * (data.length - 1))));
      const pt = points[idx];
      if (pt) setHover({ pctX: (pt.x / w) * 100, pctY: (pt.y / height) * 100, idx, value: pt.value });
    },
    [data, points],
  );

  const fmtVal = (v: number) =>
    v.toLocaleString("sv-SE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  // Hover-data
  const hoverTs = hover ? tsData?.[hover.idx] : null;
  const hoverLabel = hover
    ? (hoverTs ? fullEtikett(hoverTs.etikett, hoverTs.period, vy) : labels[hover.idx] || "")
    : "";
  const hoverSignal = hoverTs?.signal;
  const hoverSignalColor = hoverSignal ? SIGNAL_COLORS[hoverSignal] : null;
  const hoverSignalLabel = hoverSignal ? SIGNAL_LABELS[hoverSignal] : null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
      style={{ position: "relative", cursor: hover ? "crosshair" : "default", height: "100%" }}
    >
      <svg viewBox={`0 0 ${w} ${height}`} style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }} preserveAspectRatio="none">
        {/* 95 %-band (yttre, ljusare) */}
        {band95Path && <polygon points={band95Path} fill="#00AB60" opacity="0.08" />}
        {/* 80 %-band (inre, mörkare) */}
        {band80Path && <polygon points={band80Path} fill="#00AB60" opacity="0.15" />}
        {/* Faktisk linje */}
        <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>

      {/* Sista-punkt med signalfärg */}
      {!hover && (
        <div style={{
          position: "absolute", left: `${lastPctX}%`, top: `${lastPctY}%`,
          width: 5, height: 5, borderRadius: "50%", background: lastColor,
          transform: "translate(-50%, -50%)", pointerEvents: "none",
        }} />
      )}

      {/* Hover */}
      {hover && (
        <>
          <div style={{
            position: "absolute", left: `${hover.pctX}%`, top: 0,
            width: 1, height: "100%", pointerEvents: "none",
            background: color, opacity: 0.18,
          }} />
          <div style={{
            position: "absolute", left: `${hover.pctX}%`, top: `${hover.pctY}%`,
            width: 7, height: 7, borderRadius: "50%",
            background: "#fff", border: `1.5px solid ${color}`,
            transform: "translate(-50%, -50%)", pointerEvents: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
          }} />
        </>
      )}

      {/* Tooltip — ljus, strukturerad */}
      {hover && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: `${hover.pctX}%`,
            transform: "translateX(-50%)",
            background: "#fff",
            border: "1px solid #e0e0e0",
            borderRadius: 8,
            padding: "8px 12px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            minWidth: 120,
          }}
        >
          {/* Datum */}
          <div style={{
            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, fontWeight: 500,
            color: "#555", marginBottom: 6, paddingBottom: 5,
            borderBottom: "1px solid #f0f0f0",
          }}>
            {hoverLabel}
          </div>

          {/* Faktiskt */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, marginBottom: 3 }}>
            <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10.5, color: "#888" }}>Faktiskt</span>
            <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: "#0a0a0a" }}>
              {fmtVal(hover.value)}{unit}
            </span>
          </div>

          {/* Förväntat */}
          {hoverTs?.yhat != null && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, marginBottom: 3 }}>
              <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10.5, color: "#888" }}>Förväntat</span>
              <span style={{ ...mono, fontSize: 12, fontWeight: 500, color: "#888" }}>
                {fmtVal(hoverTs.yhat!)}{unit}
              </span>
            </div>
          )}

          {/* Status */}
          {hoverSignalColor && hoverSignalLabel && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
              <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10.5, color: "#888" }}>Status</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: hoverSignalColor, flexShrink: 0 }} />
                <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, fontWeight: 500, color: hoverSignalColor }}>
                  {hoverSignalLabel}
                </span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
