import type { TidsseriePoint } from "../types";
import { SIGNAL_COLORS, SIGNAL_BG, SIGNAL_SHAPES, SIGNAL_LABELS, FONT, NEUTRAL, signalColor } from "../charts/constants";

// ════════════════════════════════════════════════════════════
//  Signalspråk — delas av signal-tidslinjen (SignalTimeline) och legenden.
//  Färg + FORM (på avvikelser) + textlegend, så färg aldrig är enda
//  informationsbäraren.
//
//  Designval: grön/neutral ritas som rena fält; bevaka (triangel) och
//  avvikelse (romb) får en form — så att det som kräver uppmärksamhet
//  framträder, både visuellt och för färgseende.
// ════════════════════════════════════════════════════════════

// Statustagg (pill med ord) — visar status vid t.ex. grafnamn/paneler.
export function StatusTag({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const color = SIGNAL_COLORS[status];
  const bg = SIGNAL_BG[status];
  const label = SIGNAL_LABELS[status];
  if (!label) return null;
  const sm = size === "sm";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: sm ? 4 : 5,
      padding: sm ? "1px 7px" : "2px 10px", borderRadius: 999, background: bg, color,
      fontFamily: FONT, fontSize: sm ? 9.5 : 11, fontWeight: 600, whiteSpace: "nowrap",
      verticalAlign: "middle", flexShrink: 0,
    }}>
      <span style={{ width: sm ? 5 : 6, height: sm ? 5 : 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// Vit formglyf — ritas bara för gul/rod (avvikelser).
export function ShapeGlyph({ shape, size = 9 }: { shape: "circle" | "triangle" | "diamond"; size?: number }) {
  const fill = "rgba(255,255,255,0.96)";
  const v = 10;
  if (shape === "triangle") {
    return <svg width={size} height={size} viewBox={`0 0 ${v} ${v}`} aria-hidden="true"><polygon points="5,1.2 9,8.8 1,8.8" fill={fill} /></svg>;
  }
  if (shape === "diamond") {
    return <svg width={size} height={size} viewBox={`0 0 ${v} ${v}`} aria-hidden="true"><polygon points="5,1 9,5 5,9 1,5" fill={fill} /></svg>;
  }
  return <svg width={size - 1} height={size - 1} viewBox={`0 0 ${v} ${v}`} aria-hidden="true"><circle cx="5" cy="5" r="4" fill={fill} /></svg>;
}

/** En cells innehåll: färgat fält, glyf bara på gul/rod. */
export function SignalCellInner({ sig }: { sig?: "gron" | "gul" | "rod" }) {
  if (sig === "gul" || sig === "rod") return <ShapeGlyph shape={SIGNAL_SHAPES[sig]} />;
  return null;
}

// ── Kort-remsa: en rad celler för EN indikator (i KPI-kortet) ──
interface StripProps {
  serie: TidsseriePoint[];
  periods?: number;
  height?: number;
}

export default function SignalStrip({ serie, periods = 12, height = 16 }: StripProps) {
  const pts = serie.slice(-periods);
  if (pts.length === 0) return null;

  const antal = { gron: 0, gul: 0, rod: 0, ingen: 0 };
  for (const p of pts) {
    if (p.signal === "gron") antal.gron++;
    else if (p.signal === "gul") antal.gul++;
    else if (p.signal === "rod") antal.rod++;
    else antal.ingen++;
  }
  const sammanfattning = [
    antal.gron ? `${antal.gron} i fas` : "",
    antal.gul ? `${antal.gul} bevaka` : "",
    antal.rod ? `${antal.rod} avvikelse` : "",
  ].filter(Boolean).join(", ");

  return (
    <div
      role="img"
      aria-label={`Signalhistorik, ${pts.length} perioder: ${sammanfattning || "ingen signal"}`}
      style={{ display: "flex", gap: 2 }}
    >
      {pts.map((p, i) => (
        <div
          key={i}
          title={`${p.etikett}: ${p.signal ? SIGNAL_LABELS[p.signal] : "ingen signal"}`}
          style={{
            flex: 1, height, borderRadius: 2.5, background: signalColor(p.signal),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <SignalCellInner sig={p.signal} />
        </div>
      ))}
    </div>
  );
}

// ── Legend (delad) ──
export function SignalLegend({ note }: { note?: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
      {(["gron", "gul", "rod"] as const).map((sig) => (
        <span key={sig} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 16, height: 16, borderRadius: 3, background: SIGNAL_COLORS[sig],
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <SignalCellInner sig={sig} />
          </span>
          <span style={{ fontSize: 11.5, color: "#666", fontFamily: FONT }}>{SIGNAL_LABELS[sig]}</span>
        </span>
      ))}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 16, height: 16, borderRadius: 3, background: NEUTRAL }} />
        <span style={{ fontSize: 11.5, color: "#999", fontFamily: FONT }}>Ingen signal</span>
      </span>
      {note && (
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#aaa", fontFamily: FONT }}>{note}</span>
      )}
    </div>
  );
}
