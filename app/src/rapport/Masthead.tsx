// rapport/Masthead.tsx: kapitlets eller sammanfattningens masthead (stilguiden
// 4.2 och 4.3). Ägare: WP9.
//
// Ordning: logotyp 28 px · kicker (versal, farg.fokus) · titel (h1,
// typ.roll.titel) · 2 px linje i farg.fokus (enda linjen i läsflödet) · dek
// (typ.roll.ingress, högst två meningar) · metarad (typ.roll.not, farg.text3)
// med delarna avskilda av " · ". Tidsupplösningsväljaren (children) står sist
// i metaraden och bara när den har något att välja (rapport/TidsupplosningVal).

import { Fragment, type ReactNode } from "react";
import s from "./Masthead.module.css";

export interface MastheadProps {
  kicker?: string;
  titel: string;
  dek?: string;
  /** Metaradens delar i ordning, t.ex. ["Årsanalys 2025", "10 indikatorer i 4 avsnitt"]. */
  metarad: ReactNode[];
  /** Tidsupplösningsväljaren, sist i metaraden. */
  children?: ReactNode;
  /** Regionens logotyp överst (kapitelsidan). */
  logotyp?: boolean;
}

export default function Masthead({ kicker, titel, dek, metarad, children, logotyp = false }: MastheadProps): ReactNode {
  return (
    <header className={s.masthead} data-masthead="">
      {logotyp && (
        <img className={s.logotyp} src={`${import.meta.env.BASE_URL}logo_farg.svg`} alt="Region Halland" />
      )}
      {kicker && <p className={s.kicker}>{kicker}</p>}
      <h1 className={s.titel}>{titel}</h1>
      <div className={s.linje} aria-hidden="true" />
      {dek && <p className={s.dek}>{dek}</p>}
      <div className={s.metarad} data-metarad="">
        <p className={s.meta}>
          {metarad.map((del, i) => (
            <Fragment key={i}>
              {i > 0 && <span className={s.skiljare} aria-hidden="true">{" · "}</span>}
              <span className={s.del}>{del}</span>
            </Fragment>
          ))}
        </p>
        {children}
      </div>
    </header>
  );
}
