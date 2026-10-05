// rapport/Avsnitt.tsx: ett avsnitt med nummer, rubrik, dek och indikatorer
// (stilguiden 4.3). Ägare: WP9.
//
// Nummer + rubrik i typ.roll.avsnitt (h2), dek i typ.roll.ingress farg.text2
// när den finns, sedan indikatorerna. Dagens `analys` per avsnitt är en
// statusräkning och visas inte (stilguiden 3.4: den står i översikten).

import type { ReactNode } from "react";
import type { AvsnittModell } from "../data/modell";
import t from "./delat.module.css";
import s from "./Avsnitt.module.css";

export interface AvsnittProps {
  avsnitt: AvsnittModell;
  nummer: string;
  children: ReactNode;
}

export default function Avsnitt({ avsnitt, nummer, children }: AvsnittProps): ReactNode {
  const rubrikId = `${avsnitt.id}-rubrik`;
  return (
    <section data-block={avsnitt.id} data-avsnitt="" aria-labelledby={rubrikId}>
      <h2 id={rubrikId} className={t.avsnittsrubrik}>
        <span className={t.nr}>{nummer}</span>
        {avsnitt.namn}
      </h2>
      {avsnitt.dek && <p className={`${t.ingress} ${s.dek}`}>{avsnitt.dek}</p>}
      <div className={s.indikatorer}>{children}</div>
    </section>
  );
}
