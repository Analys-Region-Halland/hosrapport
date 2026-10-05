// rapport/DetViktigaste.tsx: blocket Det viktigaste, högst sex punkter
// (stilguiden 3.4 och 4.3). Ägare: WP9.
//
// En mening per punkt i typ.roll.brod, en grön fyrkant som punkt och sist en
// länk till indikatorn ("se 2.3"). Begrepp länkas första gången i blocket
// (eget omfång per kapitelblock, stilguiden 5.7). PunktLista används också
// under varje kapitel i sammanfattningen.

import { useMemo, type ReactNode } from "react";
import Begrepp from "../begrepp/Begrepp";
import { lankaBegrepp } from "../begrepp/lanka";
import { BEGREPP } from "../begrepp/register";
import Lank from "../nav/Lank";
import { KAPITELBLOCK, type Route } from "../nav/route";
import t from "./delat.module.css";
import s from "./DetViktigaste.module.css";

export interface ViktigPunkt {
  text: string;
  /** Länk till indikatorn: synlig text "se 2.3", indikatorns namn för skärmläsare. */
  lank?: { till: Route; text: string; namn?: string };
}

export interface DetViktigasteProps {
  punkter: ViktigPunkt[];
  /** data-block; förval KAPITELBLOCK.viktigast. */
  blockId?: string;
}

export default function DetViktigaste({ punkter, blockId = KAPITELBLOCK.viktigast }: DetViktigasteProps): ReactNode {
  if (!punkter.length) return null;
  const rubrikId = `${blockId}-rubrik`;
  return (
    <section data-block={blockId} aria-labelledby={rubrikId}>
      <h2 id={rubrikId} className={t.blockrubrik}>Det viktigaste</h2>
      <PunktLista punkter={punkter} />
    </section>
  );
}

/** Punkterna som lista, med begreppen länkade en gång i listan. */
export function PunktLista({ punkter }: { punkter: ViktigPunkt[] }): ReactNode {
  const delar = useMemo(() => {
    const redan = new Set<string>();
    return punkter.map((p) => lankaBegrepp(p.text, BEGREPP, redan));
  }, [punkter]);
  if (!punkter.length) return null;
  return (
    <ul className={s.lista} data-punkter="">
      {punkter.map((p, i) => (
        <li key={i} className={s.punkt}>
          {delar[i].map((d, j) => (typeof d === "string" ? d : <Begrepp key={j} id={d.id}>{d.text}</Begrepp>))}
          {p.lank && (
            <>
              {" "}
              <Lank till={p.lank.till} className={`${t.lank} ${s.se}`} data-se="">
                {p.lank.text}
                {p.lank.namn && <span className={t.dold}>{`, ${p.lank.namn}`}</span>}
              </Lank>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
