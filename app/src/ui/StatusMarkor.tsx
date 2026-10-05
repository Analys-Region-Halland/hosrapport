// ui/StatusMarkor.tsx: statusmarkören, pill med "I fas", "Bevaka" eller "Avvikelse" (stilguiden 5.1).
// Ägare: WP4. Text alltid med; inte klickbar. Beskrivande mått (status null)
// får ingen markör alls, så komponenten tar bara emot en faktisk status.

import type { Status } from "../data/modell";
import s from "./StatusMarkor.module.css";

export interface StatusMarkorProps {
  status: Status;
}

const ETIKETT: Record<Status, string> = { gron: "I fas", gul: "Bevaka", rod: "Avvikelse" };

export default function StatusMarkor({ status }: StatusMarkorProps) {
  return (
    <span className={`${s.markor} ${s[status]}`} data-status={status}>
      {ETIKETT[status]}
    </span>
  );
}
