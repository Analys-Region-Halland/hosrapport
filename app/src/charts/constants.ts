// Signalpalett: trafikljus (grön/gul/röd). Datanycklarna heter gron/gul/rod
// (semantiska, från R). Färg är ALDRIG enda informationsbäraren: kombineras
// alltid med form (SIGNAL_SHAPES) och textetikett (SIGNAL_LABELS), så att även
// röd-grön färgblindhet kan särskilja status. Dämpade toner för rapportkänsla.
export const SIGNAL_COLORS: Record<string, string> = {
  gron: "#2E7D52", // I fas
  gul:  "#C28A1E", // Bevaka
  rod:  "#B23A2E", // Avvikelse
};

// Ljusa bakgrundstoner (markeringar) — harmoniserade med trafikljuspaletten
export const SIGNAL_BG: Record<string, string> = {
  gron: "#E8F1EC",
  gul:  "#F6ECD9",
  rod:  "#F4E3DF",
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
