// Signalpalett — FÄRGBLIND-SÄKER (Okabe-Ito).
// Datanycklarna heter gron/gul/rod (semantiska, från R), men färgerna är
// valda för att kunna särskiljas även vid röd-grön färgblindhet. Färg är
// ALDRIG enda informationsbäraren: kombineras alltid med form (SIGNAL_SHAPES)
// och textetikett (SIGNAL_LABELS). Se app/src/components/SignalBadge.tsx.
export const SIGNAL_COLORS: Record<string, string> = {
  gron: "#0072B2", // blå — I fas
  gul: "#E69F00",  // amber — Bevaka
  rod: "#D55E00",  // vermillion — Avvikelse
};

// Ljusa bakgrundstoner (chips/markeringar)
export const SIGNAL_BG: Record<string, string> = {
  gron: "#e4eef5",
  gul: "#fbf0db",
  rod: "#fae7dc",
};

// Formredundans — för datapunkter (d3.symbol) och SignalBadge
export const SIGNAL_SHAPES: Record<string, "circle" | "triangle" | "diamond"> = {
  gron: "circle",
  gul: "triangle",
  rod: "diamond",
};

export const SIGNAL_LABELS: Record<string, string> = {
  gron: "I fas",
  gul: "Bevaka",
  rod: "Avvikelse",
};

// Neutral linjefärg för alla tidsseriegrafer — status visas via tagg vid
// grafnamnet, inte genom att färga själva linjen.
export const NEUTRAL_LINE = "#33393f";

// Neutral fyllnadsfärg för signalceller utan signal (SignalStrip/SignalTimeline).
export const NEUTRAL = "#ececea";

// Signalfärg för en cell: status-färg, eller neutral när signal saknas.
// (Bor här, inte i SignalStrip.tsx, så komponentfilen bara exporterar
//  komponenter — react-refresh/only-export-components.)
export function signalColor(sig?: string): string {
  return sig ? SIGNAL_COLORS[sig] || NEUTRAL : NEUTRAL;
}

export const FONT = "'IBM Plex Sans', system-ui, sans-serif";
export const FONT_MONO = "'IBM Plex Mono', monospace";
export const FONT_TITEL = "'Source Serif 4', Georgia, serif";

export const DEPT_COLORS = [
  "#2DB8F6", "#6473D9", "#FF5F4A", "#FFD939", "#895B42", "#00AB60",
];
