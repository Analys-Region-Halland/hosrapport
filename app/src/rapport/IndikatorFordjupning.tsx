// rapport/IndikatorFordjupning.tsx: fördjupningen "Om måttet, källan och
// påverkansfaktorer" (stilguiden 4.4 och 5.5). Ägare: WP9.
//
// En ui/Disclosure (riktig <details>, stängd som standard, öppnas av sök i
// sidan och skrivs ut öppen). Tre delar med etiketter i typ.roll.granssnitt 600,
// inga rubriker (en indikator har inga innehållsrubriker, princip 3):
//   Vad måttet räknar   definition, avgränsning, riktning och mål
//   Datakälla           radlista: primärkälla, huvudman, uppdateras, vägen till rapporten
//   Påverkansfaktorer   teoristycke och numrerad lista (bara när faktaunderlag finns)
// Begreppen länkas med indikatorns delade `redan`, så att ett begrepp som
// redan länkats i analysen inte länkas igen här.

import type { ReactNode } from "react";
import Prosa from "../begrepp/Prosa";
import type { KapitelModell, KpiModell, VyId } from "../data/modell";
import Disclosure from "../ui/Disclosure";
import { fordjupningTexter } from "./fordjupning";
import t from "./delat.module.css";
import s from "./IndikatorFordjupning.module.css";

export interface IndikatorFordjupningProps {
  kpi: KpiModell;
  kapitel: KapitelModell;
  vy: VyId;
  /** Begrepp som redan länkats i indikatorn (delas med analysen). */
  redan?: Set<string>;
}

export const SUMMERING = "Om måttet, källan och påverkansfaktorer";

export default function IndikatorFordjupning({ kpi, kapitel, vy, redan }: IndikatorFordjupningProps): ReactNode {
  const x = fordjupningTexter(kpi, kapitel, vy);

  return (
    <Disclosure summering={SUMMERING}>
      <div className={s.delar}>
        <div className={s.del}>
          <p className={t.etikett}>Vad måttet räknar</p>
          <Prosa text={x.matt.join("\n\n")} redan={redan} className={`${t.brod} ${s.text}`} />
        </div>

        {x.kalla.length > 0 && (
          <div className={s.del}>
            <p className={t.etikett}>Datakälla</p>
            <dl className={s.datarader}>
              {x.kalla.map((r) => (
                <div key={r.etikett} className={s.datarad}>
                  <dt>{r.etikett}</dt>
                  <dd>
                    {r.url ? <a className={t.lank} href={r.url} target="_blank" rel="noreferrer">{r.varde}</a> : r.varde}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {x.faktorer && (
          <div className={s.del}>
            <p className={t.etikett}>Påverkansfaktorer</p>
            {x.faktorer.teori && <Prosa text={x.faktorer.teori} redan={redan} className={`${t.brod} ${s.text}`} />}
            <ol className={s.faktorer}>
              {x.faktorer.lista.map((f) => (
                <li key={f.rubrik} className={s.faktor}>
                  <span className={s.faktorrubrik}>{f.rubrik}</span>
                  <Prosa text={f.text} redan={redan} />
                  {f.kalla && (
                    <p className={t.not}>
                      {f.kalla.url
                        ? <a className={t.lank} href={f.kalla.url} target="_blank" rel="noreferrer">{f.kalla.namn}</a>
                        : f.kalla.namn}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Disclosure>
  );
}
