import type { TidsseriePoint } from "../types";
import { SIGNAL_BG, SIGNAL_TEXT, SIGNAL_LABELS, FONT, NEUTRAL, signalColor } from "../charts/constants";

// ════════════════════════════════════════════════════════════
//  Signalspråk — statuschippet som rapporten använder överallt
//  (indikatorrubrik, graf-header, signalöversiktens rader).
//
//  Inga formsymboler: status bärs av trafikljusfärg + textetikett, så
//  färgen aldrig är enda informationsbäraren.
// ════════════════════════════════════════════════════════════

// Statuschip — lugn tonbotten i statusfärg + etikett, inga symboler.
// neutral=true: mått utan målriktning (volym-/strukturmått) → grått "Utan mål".
export function StatusTag({ status, size = "md", neutral = false }: { status: string; size?: "sm" | "md"; neutral?: boolean }) {
  const sm = size === "sm";
  const pad = sm ? "2px 9px" : "3px 11px";
  const fz = sm ? 10.5 : 11.5;
  if (neutral) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", padding: pad, borderRadius: 999,
        background: NEUTRAL, color: "#6B7270", fontFamily: FONT, fontSize: fz, fontWeight: 600,
        letterSpacing: ".01em", whiteSpace: "nowrap", verticalAlign: "middle", flexShrink: 0,
      }}>
        Utan mål
      </span>
    );
  }
  const label = SIGNAL_LABELS[status];
  if (!label) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: pad, borderRadius: 999,
      background: SIGNAL_BG[status], color: SIGNAL_TEXT[status] || "#444", fontFamily: FONT,
      fontSize: fz, fontWeight: 600, letterSpacing: ".01em", whiteSpace: "nowrap",
      verticalAlign: "middle", flexShrink: 0,
    }}>
      {label}
    </span>
  );
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
          style={{ flex: 1, height, borderRadius: 2.5, background: signalColor(p.signal) }}
        />
      ))}
    </div>
  );
}
