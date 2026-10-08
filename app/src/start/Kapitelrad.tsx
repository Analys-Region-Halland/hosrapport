// start/Kapitelrad.tsx: en rad i startsidans kapitelförteckning (stilguiden 4.1):
// nummer, namn, dek, metarad, eventuell notis och statusrutan (2026-10-08,
// ersätter statusmätaren). Ägare: WP11.
//
// Hela raden är en länk: länken sitter i rubriken (så att länkens namn är
// kapitlets namn och rubriknavigeringen fungerar) och dess klickyta sträcks ut
// över hela raden. Hover stryker under namnet; tangentbordsfokus ritar ringen
// runt raden.

import Lank from "../nav/Lank";
import Statusruta from "./Statusruta";
import type { StartKapitel } from "./startModell";
import type { StatusIndikator } from "./statusIndikatorer";
import s from "./Kapitelrad.module.css";

export interface KapitelradProps {
  kapitel: StartKapitel;
  /** Rubriknivå för kapitlets namn. 3 på startsidan (under temat), 4 i stilguiden. */
  rubrikniva?: 3 | 4;
  /** Indikatorerna bakom statusrutans siffror; undefined medan de hämtas. */
  indikatorer?: StatusIndikator[];
}

export default function Kapitelrad({ kapitel: k, rubrikniva = 3, indikatorer }: KapitelradProps) {
  const Rubrik = rubrikniva === 3 ? "h3" : "h4";
  return (
    <li className={s.rad} data-kapitelrad={k.id}>
      <div className={s.text}>
        <Rubrik className={s.rubrik}>
          <Lank till={{ sida: "kapitel", id: k.id, vy: k.vy }} className={s.lank} data-kapitel={k.id}>
            <span className={s.nr}>{k.nummer}</span>
            <span className={s.namn}>{k.namn}</span>
          </Lank>
        </Rubrik>
        {k.dek && <p className={s.dek}>{k.dek}</p>}
        <p className={s.meta}>
          {k.meta.map((d, i) => (
            <span key={i}>
              {i > 0 && <span className={s.skiljare} aria-hidden="true"> · </span>}
              {d}
            </span>
          ))}
        </p>
        {k.notis && <p className={s.notis}>{k.notis}</p>}
      </div>
      <div className={s.matare}>
        <Statusruta status={k.status} indikatorer={indikatorer} />
      </div>
    </li>
  );
}
