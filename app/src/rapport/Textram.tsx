// rapport/Textram.tsx: ramen kring en text som inte är rapportens egen
// löptext (2026-10-08): AI-analysen vid indikatorn och verksamhetens
// kommentar. En och samma ram för båda, i rapportens formspråk:
//
//   - en ljus ruta med hårlinje och rundade hörn, utan skugga, i textspalten,
//     så bred att texten inuti får brödtextens radlängd
//   - överst en rad med etiketten som kicker (versaler, farg.fokus, med ikon)
//     och till höger uppgifter eller en länk ("Så skapas texten →",
//     "Robin R, uppdaterad 16 juni 2026")
//   - därunder innehållet: brödtext, och i kommentaren gärna rubriker
//
// Ersätter Textmarke (märket före texten), som kändes som ett främmande element.

import type { ReactNode } from "react";
import Lank from "../nav/Lank";
import type { Route } from "../nav/route";
import s from "./Textram.module.css";

export interface TextramProps {
  ikon: "ai" | "kommentar";
  etikett: string;
  /** En markering efter etiketten, t.ex. "Fiktivt exempel". */
  markering?: string;
  /** Uppgifterna till höger på etikettraden (vem och när). */
  uppgifter?: ReactNode;
  /** Länken till höger på etikettraden. */
  lank?: { till: Route; text: string };
  children: ReactNode;
  /** data-attribut för tester och export. */
  data?: Record<string, string>;
}

const IKONER: Record<TextramProps["ikon"], ReactNode> = {
  ai: <path className={s.fylld} d="M10 2.5 11.7 8.3 17.5 10 11.7 11.7 10 17.5 8.3 11.7 2.5 10 8.3 8.3Z" />,
  kommentar: <path d="M3.5 4.5h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3H3.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />,
};

export default function Textram({ ikon, etikett, markering, uppgifter, lank, children, data = {} }: TextramProps): ReactNode {
  return (
    <div className={s.ram} {...data}>
      <div className={s.huvud}>
        <p className={s.etikett}>
          <svg className={s.ikon} viewBox="0 0 20 20" aria-hidden="true">{IKONER[ikon]}</svg>
          {etikett}
          {markering && <span className={s.markering}>{markering}</span>}
        </p>
        {uppgifter && <p className={s.uppgifter}>{uppgifter}</p>}
        {lank && (
          <Lank till={lank.till} className={s.lank}>
            {lank.text} <span aria-hidden="true">→</span>
          </Lank>
        )}
      </div>
      <div className={s.innehall}>{children}</div>
    </div>
  );
}
