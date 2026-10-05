// start/Statusmatare.tsx: statusmätaren på startsidan (stilguiden 4.1): en tunn
// stapel med ett segment per status och räkningen i text under, t.ex.
// "29 i fas · 20 bevaka · 31 avvikelse". Ägare: WP11.
//
// Färg är aldrig enda bäraren: stapeln är dold för skärmläsare och texten står
// alltid med. Segment med noll indikatorer ritas inte. Utan indikatorer med
// status ritas ingenting (beskrivande mått har ingen status).

import { Fragment } from "react";
import { antalMedStatus, STATUSORD, STATUSORDNING, type StatusRakning } from "./startModell";
import s from "./Statusmatare.module.css";

export interface StatusmatareProps {
  status: StatusRakning;
  /** "lage": Läget just nu (gränssnittstext). "kapitel": kapitelraden (nottext). */
  storlek?: "lage" | "kapitel";
}

export default function Statusmatare({ status, storlek = "kapitel" }: StatusmatareProps) {
  if (antalMedStatus(status) === 0) return null;
  const synliga = STATUSORDNING.filter((st) => status[st] > 0);
  return (
    <div className={`${s.matare} ${s[storlek]}`} data-statusmatare="">
      <div className={s.stapel} aria-hidden="true">
        {synliga.map((st) => (
          <span key={st} className={`${s.segment} ${s[st]}`} style={{ flexGrow: status[st] }} data-status={st} />
        ))}
      </div>
      <p className={s.rakning}>
        {STATUSORDNING.map((st, i) => (
          <Fragment key={st}>
            {i > 0 && (
              <>
                <span className={s.osynlig}>,</span>
                <span className={s.skiljare} aria-hidden="true"> · </span>
              </>
            )}
            <span className={s.post}>
              <span className={s.tal}>{status[st]}</span> {STATUSORD[st]}
            </span>
          </Fragment>
        ))}
      </p>
    </div>
  );
}
