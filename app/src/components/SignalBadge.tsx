import { SIGNAL_COLORS, SIGNAL_LABELS, FONT } from "../charts/constants";

// SignalBadge — status med färg + text (ingen symbol). En enkel färgprick
// plus ordet ("I fas/Bevaka/Avvikelse"). Färgen är färgblind-säker (Okabe-Ito)
// och texten är den explicita kanalen — tillgängligt utan symboler.

interface Props {
  signal: string;
  showLabel?: boolean;
  size?: number;
  /** Prefix till aria-label, t.ex. antal ("3 avvikelser") */
  ariaPrefix?: string;
}

export default function SignalBadge({ signal, showLabel = false, size = 9, ariaPrefix }: Props) {
  const color = SIGNAL_COLORS[signal] || "#a3a3a3";
  const label = SIGNAL_LABELS[signal] || "";
  return (
    <span
      role="img"
      aria-label={ariaPrefix ? `${ariaPrefix} (${label})` : label}
      style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
    >
      <span style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {showLabel && (
        <span style={{ fontSize: 10.5, fontWeight: 600, color, fontFamily: FONT }}>{label}</span>
      )}
    </span>
  );
}
