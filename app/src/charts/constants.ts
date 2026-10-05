// Signalpalett: trafikljus (grön/gul/röd). Datanycklarna heter gron/gul/rod
// (semantiska, från R). Färg är ALDRIG enda informationsbäraren: kombineras
// alltid med form och textetikett (SIGNAL_LABELS), så att även
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

// Mörkare textton per status — för chip och etiketter på ljus tonbotten
// (SIGNAL_BG). Bor här så att både statuschippet och signalöversiktens
// filterchip läser samma värden.
export const SIGNAL_TEXT: Record<string, string> = {
  gron: "#1F6A43",
  gul:  "#8A5E12",
  rod:  "#9A2E22",
};

export const SIGNAL_LABELS: Record<string, string> = {
  gron: "I fas",
  gul: "Bevaka",
  rod: "Avvikelse",
};

// Neutral linjefärg (signaltidslinjens sparklines) — status visas via tagg,
// inte genom att färga linjen.
export const NEUTRAL_LINE = "#33393f";

// Halland i regiongrönt i alla tidsseriegrafer. Övriga regioner ligger i grått
// bakom och kan fästas med klick — då får de en färg ur PIN_COLORS (Region
// Hallands palett utan grönt, samma ordning som i kommundata).
export const HALLAND_LINE = "#00664D";
export const PIN_COLORS = ["#004990", "#FF7E00", "#433C9D", "#2DB8F6", "#A51300", "#895B42"];
export function pinColor(i: number): string {
  return PIN_COLORS[i % PIN_COLORS.length];
}

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
