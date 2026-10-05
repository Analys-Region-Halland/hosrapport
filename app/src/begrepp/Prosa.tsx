// begrepp/Prosa.tsx: löptext där begreppen länkas (lanka.ts, stilguiden 5.7).
// Ägare: WP5.
//
// Texten delas i stycken vid tomma rader och varje stycke blir ett <p>. Begrepp
// länkas bara första gången per omfång: skicka samma `redan` till alla Prosa i en
// indikator (och ett eget per kapitelblock), annars är komponenten sitt eget
// omfång. Explicit markering `[[id|text]]` i texten länkas före automatiska
// träffar. Används aldrig för rubriker, knappar eller tabeller; där tar
// `utanMarkering` bort markeringen.
//
// Typografin ärvs från omgivningen (typ.roll.brod i analys och fördjupning);
// komponenten sätter bara styckeavståndet.

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import Begrepp from "./Begrepp";
import { gorAnsprak, lankadeId, lankaStycken, slappAnsprak } from "./lanka";
import { BEGREPP, type Begrepp as BegreppTyp } from "./register";
import s from "./Prosa.module.css";

export interface ProsaProps {
  text: string;
  redan?: Set<string>;      // delas inom en indikator
  /** Register att länka mot. Förval: hela registret ur innehall/begrepp.json. */
  register?: BegreppTyp[];
  className?: string;
}

export default function Prosa({ text, redan, register = BEGREPP, className }: ProsaProps): ReactNode {
  const agarId = useId();
  const [eget] = useState(() => new Set<string>());
  const omfang = redan ?? eget;
  const stycken = useMemo(() => text.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean), [text]);

  // Länkningen sker under renderingen så att första förekomsten följer
  // dokumentordningen. lankaStycken är idempotent per agarId (se lanka.ts).
  const delar = lankaStycken(stycken, register, omfang, agarId);
  const lankade = lankadeId(delar).join(" ");

  // Anspråken lever lika länge som komponenten: de tas tillbaka efter
  // StrictMode-cykeln och släpps när komponenten tas bort.
  useEffect(() => {
    gorAnsprak(omfang, agarId, lankade ? lankade.split(" ") : []);
    return () => slappAnsprak(omfang, agarId);
  }, [omfang, agarId, lankade]);

  return (
    <div className={className ? `${s.prosa} ${className}` : s.prosa} data-prosa="">
      {delar.map((stycke, i) => (
        <p key={i}>
          {stycke.map((d, j) =>
            typeof d === "string" ? d : <Begrepp key={j} id={d.id} register={register}>{d.text}</Begrepp>,
          )}
        </p>
      ))}
    </div>
  );
}
