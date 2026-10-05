// rapport/Nyckeltal.tsx: nyckeltalsraden "87,7 % · plats 8 av 21 · 2024"
// (stilguiden 4.4 och 5.2). Ägare: WP9.
//
// Den enda platsen för värde, plats och period i en indikator. typ.roll.granssnitt:
// värdet i 600 farg.black, resten i farg.text2, avskiljaren " · " i farg.text3.
// Beskrivande mått: "45 300 kr · beskrivande mått · 2024". Texterna byggs i
// rapportText.ts (nyckeltalDelar).

import { Fragment, type ReactNode } from "react";
import type { KpiModell, VyId } from "../data/modell";
import { nyckeltalDelar } from "./rapportText";
import t from "./delat.module.css";
import s from "./Nyckeltal.module.css";

export interface NyckeltalProps {
  kpi: KpiModell;
  vy: VyId;
}

export default function Nyckeltal({ kpi, vy }: NyckeltalProps): ReactNode {
  const { varde, delar } = nyckeltalDelar(kpi, vy);
  return (
    <p className={s.rad} data-nyckeltal="">
      <span className={s.varde}>{varde}</span>
      {delar.map((d) => (
        <Fragment key={d}>
          <span className={s.skiljare} aria-hidden="true">·</span>
          <span className={t.dold}>, </span>
          <span className={s.del}>{d}</span>
        </Fragment>
      ))}
    </p>
  );
}
