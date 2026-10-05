// rapport/Statusmatare.tsx: statusmätaren i sammanfattningen (stilguiden 4.1
// och 4.2): en tunn stapel i tre delar (i fas, bevaka, avvikelse) och raden
// "3 i fas · 4 bevaka · 3 avvikelse" under. Stapeln är dekor för seende; raden
// bär informationen. Ägare: WP9. (Startsidan har sin egen i start/, WP11.)

import type { ReactNode } from "react";
import type { Status } from "../data/modell";
import s from "./Statusmatare.module.css";

export interface StatusmatareProps {
  antal: Record<Status, number>;
}

const ORDNING: Status[] = ["gron", "gul", "rod"];
const ORD: Record<Status, string> = { gron: "i fas", gul: "bevaka", rod: "avvikelse" };

export default function Statusmatare({ antal }: StatusmatareProps): ReactNode {
  const summa = ORDNING.reduce((n, st) => n + antal[st], 0);
  if (!summa) return null;
  return (
    <div className={s.matare} data-statusmatare="">
      <div className={s.stapel} aria-hidden="true">
        {ORDNING.filter((st) => antal[st] > 0).map((st) => (
          <span key={st} className={`${s.del} ${s[st]}`} style={{ flexGrow: antal[st] }} />
        ))}
      </div>
      <p className={s.rad}>{ORDNING.map((st) => `${antal[st]} ${ORD[st]}`).join(" · ")}</p>
    </div>
  );
}
