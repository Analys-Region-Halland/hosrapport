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
// komponenten sätter bara styckeavståndet. Markeringen är en knapp och bryts som
// en enhet, så ett skiljetecken direkt efter den hålls ihop med den (stilguiden
// 5.7) i stället för att hamna ensamt först på nästa rad.

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import Begrepp from "./Begrepp";
import { gorAnsprak, lankadeId, lankaStycken, slappAnsprak } from "./lanka";
import { BEGREPP, type Begrepp as BegreppTyp } from "./register";
import s from "./Prosa.module.css";

// Skiljetecken som inte får inleda en rad: punkt, komma, kolon, semikolon,
// frågetecken, utropstecken, högerparentes och avslutande citattecken.
const SKILJETECKEN = /^[.,:;!?)\]”»'"]+/;

type Del = ReturnType<typeof lankaStycken>[number][number];

function medSkiljetecken(stycke: Del[], register: BegreppTyp[]): ReactNode[] {
  const ut: ReactNode[] = [];
  for (let j = 0; j < stycke.length; j++) {
    const d = stycke[j];
    if (typeof d === "string") {
      ut.push(d);
      continue;
    }
    const term = <Begrepp key={j} id={d.id} register={register}>{d.text}</Begrepp>;
    const nasta = stycke[j + 1];
    const tecken = typeof nasta === "string" ? SKILJETECKEN.exec(nasta)?.[0] : undefined;
    if (!tecken) {
      ut.push(term);
      continue;
    }
    ut.push(<span key={`h${j}`} className={s.hel}><Begrepp id={d.id} register={register}>{d.text}</Begrepp>{tecken}</span>);
    ut.push((nasta as string).slice(tecken.length));
    j++;
  }
  return ut;
}

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
        <p key={i}>{medSkiljetecken(stycke, register)}</p>
      ))}
    </div>
  );
}
