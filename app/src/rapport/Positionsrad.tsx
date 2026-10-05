// rapport/Positionsrad.tsx: positionsraden "2 Vårdgarantin › 2.3 Väntande till
// operation" (stilguiden 4.5). Ägare: WP6.
//
// typ.roll.not i farg.text2, aktuell del i farg.black 600. Ingen statusmarkör
// och ingen förloppslinje. Med onOppnaInnehall är raden en knapp som öppnar
// innehållsförteckningen som ark (mellan och mobil). Raden kortas med ellips;
// de första delarna kortas först. `kort` visar bara den sista delen (mobil).

import { Fragment, type ReactNode } from "react";
import s from "./Positionsrad.module.css";

export interface PositionsradProps {
  delar: { id: string; text: string }[];
  /** Finns: raden är en knapp som öppnar innehållsförteckningen. */
  onOppnaInnehall?(): void;
  /** Om innehållsförteckningen är öppen (aria-expanded på knappen). */
  innehallOppet?: boolean;
  /** Bara den sista delen (mobil). */
  kort?: boolean;
}

export default function Positionsrad({ delar, onOppnaInnehall, innehallOppet = false, kort = false }: PositionsradProps): ReactNode {
  const visade = kort ? delar.slice(-1) : delar;
  const spar = visade.map((d, i) => (
    <Fragment key={d.id}>
      {i > 0 && (
        <>
          <span className={s.skiljare} aria-hidden="true">›</span>
          <span className="visuellt-dold">, </span>
        </>
      )}
      <span className={i === visade.length - 1 ? s.aktuell : s.del}>{d.text}</span>
    </Fragment>
  ));

  if (onOppnaInnehall) {
    return (
      <button
        type="button"
        className={s.knapp}
        aria-haspopup="dialog"
        aria-expanded={innehallOppet}
        onClick={onOppnaInnehall}
        data-positionsrad="knapp"
      >
        <span className="visuellt-dold">Innehåll. Du läser: </span>
        <span className={s.spar}>{spar}</span>
        <svg className={s.ikon} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
    );
  }
  return (
    <p className={s.rad} data-positionsrad="">
      <span className="visuellt-dold">Du läser: </span>
      <span className={s.spar}>{spar}</span>
    </p>
  );
}
