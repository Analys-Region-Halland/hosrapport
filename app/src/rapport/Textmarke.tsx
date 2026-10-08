// rapport/Textmarke.tsx: märket före en text som inte är rapportens egen
// löptext (2026-10-08): AI-analysen vid indikatorn och verksamhetens
// kommentar. Ett och samma element för båda: en liten vit ruta med hårlinjeram,
// en ikon i farg.fokus, rubriken i fet svart och uppgifterna efter (vem, när,
// varifrån). Texten därunder är vanlig löptext i typ.roll.brod, utan ram,
// så att märket är ett element men texten följer rapportformatet.
//
// Med `till` är hela rutan en länk (AI-analysen leder till Så skapas texten),
// och länktexten `vidare` står sist i farg.fokus med en pil.

import type { ReactNode } from "react";
import type { Route } from "../nav/route";
import Lank from "../nav/Lank";
import s from "./Textmarke.module.css";

export interface TextmarkeProps {
  ikon: "ai" | "kommentar";
  rubrik: string;
  /** Uppgifterna efter rubriken. */
  children?: ReactNode;
  /** Hela märket blir en länk hit. */
  till?: Route;
  /** Länktexten sist, när märket är en länk. */
  vidare?: string;
  /** data-attribut för tester och export. */
  data?: Record<string, string>;
}

const IKONER: Record<TextmarkeProps["ikon"], ReactNode> = {
  ai: <path className={s.fylld} d="M10 2.5 11.7 8.3 17.5 10 11.7 11.7 10 17.5 8.3 11.7 2.5 10 8.3 8.3Z" />,
  kommentar: <path d="M3.5 4.5h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3H3.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />,
};

export default function Textmarke({ ikon, rubrik, children, till, vidare, data = {} }: TextmarkeProps): ReactNode {
  const innehall = (
    <>
      <svg className={s.ikon} viewBox="0 0 20 20" aria-hidden="true">{IKONER[ikon]}</svg>
      <b className={s.rubrik}>{rubrik}</b>
      {children && <span className={s.uppgifter}>{children}</span>}
      {till && vidare && <span className={s.vidare}>{vidare} <span aria-hidden="true">→</span></span>}
    </>
  );
  return till ? (
    <Lank till={till} className={`${s.marke} ${s.lank}`} {...data}>{innehall}</Lank>
  ) : (
    <p className={s.marke} {...data}>{innehall}</p>
  );
}
