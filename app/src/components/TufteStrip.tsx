import { useState } from "react";
import type { KpiData } from "../types";
import { fmtVarde, fmtSuffix } from "../utils/format";
import Sparkline from "./Sparkline";

const STATUS: Record<string, { color: string; label: string }> = {
  gron: { color: "#16a34a", label: "I fas" },
  gul: { color: "#ea980c", label: "Bevaka" },
  rod: { color: "#dc2626", label: "Avvikelse" },
};

const mono: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontFeatureSettings: "'tnum'",
  fontVariantNumeric: "tabular-nums",
};

interface Props {
  kpier: KpiData[];
  onOpenChart: (kpi: KpiData) => void;
}

export default function TufteStrip({ kpier, onOpenChart }: Props) {
  return (
    <div
      data-tufte-strip
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(kpier.length, 4)}, 1fr)`,
        borderTop: "1px solid #d8d8d4",
        borderBottom: "1px solid #d8d8d4",
        margin: "20px 0",
      }}
    >
      {kpier.map((kpi, i) => (
        <TuftePanel
          key={kpi.id}
          kpi={kpi}
          isFirst={i === 0}
          onClick={() => onOpenChart(kpi)}
        />
      ))}
    </div>
  );
}

// ════════════════════════════════════════
//  Tufte-panel — en enskild KPI-multipel
// ════════════════════════════════════════

function TuftePanel({
  kpi,
  isFirst,
  onClick,
}: {
  kpi: KpiData;
  isFirst: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const st = STATUS[kpi.status] || { color: "#999", label: "Okänd" };
  const dec = kpi.enhet === "procent" ? 1 : 0;
  const suffix = fmtSuffix(kpi.enhet);
  const cu = kpi.enhet === "procent" ? " pp" : "";
  const val = kpi.forandring;
  const isGood = kpi.inverterad ? val < 0 : val > 0;
  const isBad = kpi.inverterad ? val > 0 : val < 0;
  const changeColor = isGood ? "#15803d" : isBad ? "#b91c1c" : "#666";
  const arrow = val > 0 ? "\u2191" : val < 0 ? "\u2193" : "\u2192";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "16px 18px 14px",
        borderLeft: isFirst ? "none" : "1px solid #eae9e5",
        cursor: "pointer",
        background: hovered ? "rgba(0,0,0,0.015)" : "transparent",
        transition: "background 0.15s",
        minWidth: 0,
      }}
    >
      {/* Rad 1: Status-punkt + namn */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: st.color,
            flexShrink: 0,
            boxShadow:
              kpi.status === "rod" ? `0 0 0 2.5px ${st.color}18` : "none",
          }}
        />
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 500,
            color: "#555",
            letterSpacing: "0.005em",
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {kpi.namn}
        </span>
      </div>

      {/* Rad 2: Värde + förändring */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 10,
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 2,
            minWidth: 0,
          }}
        >
          <span
            style={{
              ...mono,
              fontSize: 24,
              fontWeight: 600,
              color: "#0a0a0a",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {fmtVarde(kpi.senaste, kpi.enhet, dec)}
          </span>
          <span
            style={{ fontSize: 13, fontWeight: 400, color: "#888" }}
          >
            {suffix}
          </span>
        </div>
        <span
          style={{
            ...mono,
            fontSize: 11,
            fontWeight: 600,
            color: changeColor,
            lineHeight: 1,
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {arrow}
          {Math.abs(val).toLocaleString("sv-SE", {
            maximumFractionDigits: 1,
          })}
          {cu}
        </span>
      </div>

      {/* Rad 3: Sparkline */}
      <div style={{ height: 44 }}>
        <Sparkline
          data={kpi.tidsserie.map((d) => d.varde)}
          color={st.color}
          height={44}
          labels={kpi.tidsserie.map((d) => d.etikett)}
          unit={suffix}
          decimals={dec}
        />
      </div>
    </div>
  );
}
