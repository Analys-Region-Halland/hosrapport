// begrepp/BegreppSida.tsx: begreppslistan på #/begrepp och #/begrepp/{id}
// (stilguiden 5.7, arkitektur 4.6). Ägare: WP5.
//
// Alfabetisk lista med term (typ.roll.figurtitel), kort och lång förklaring,
// källa och se även. Varje begrepp har ankaret `begrepp-{id}`; när sidan visas
// med ett id rullas begreppet fram och får fokus. Länkarna i "Se även" och i
// toggletipen går till `#/begrepp/{id}`.

import { createElement, useEffect, useMemo, type ReactNode } from "react";
import { alfabetisk, ankareFor, BEGREPP, hittaBegrepp, type Begrepp } from "./register";
import s from "./BegreppSida.module.css";

export interface BegreppSidaProps {
  id?: string;
}

export default function BegreppSida({ id }: BegreppSidaProps): ReactNode {
  return (
    <article className={s.sida} data-begrepp-sida="">
      <h1 className={s.titel}>Begrepp</h1>
      <p className={s.ingress}>
        Förklaringar till ord och mått som används i rapporten. Ord med prickad understrykning i texten öppnar samma
        förklaring.
      </p>
      <BegreppLista id={id} rubrikniva={2} />
    </article>
  );
}

export interface BegreppListaProps {
  /** Begreppet som ska rullas fram och få fokus. */
  id?: string;
  /** Rubriknivå för termerna: 2 på egen sida, lägre inbäddat. */
  rubrikniva?: 2 | 3 | 4;
  register?: Begrepp[];
}

/** Själva listan, utan sidans rubrik. Används av BegreppSida och stilguiden. */
export function BegreppLista({ id, rubrikniva = 2, register = BEGREPP }: BegreppListaProps) {
  const lista = useMemo(() => alfabetisk(register), [register]);

  useEffect(() => {
    if (!id) return;
    const el = document.getElementById(ankareFor(id));
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    el.focus({ preventScroll: true });
  }, [id]);

  return (
    <div className={s.lista} data-begrepp-lista="">
      {lista.map((b) => (
        <section
          key={b.id}
          id={ankareFor(b.id)}
          className={s.post}
          tabIndex={-1}
          aria-labelledby={`${ankareFor(b.id)}-term`}
          data-begrepp-post={b.id}
        >
          {createElement(`h${rubrikniva}`, { id: `${ankareFor(b.id)}-term`, className: s.term }, b.term)}
          <p className={s.kort}>{b.kort}</p>
          {b.lang && <p className={s.lang}>{b.lang}</p>}
          {b.kalla && (
            <p className={s.meta}>
              Källa:{" "}
              {b.kalla.url ? <a className={s.lank} href={b.kalla.url}>{b.kalla.namn}</a> : b.kalla.namn}
            </p>
          )}
          <SeAven begrepp={b} register={register} />
        </section>
      ))}
    </div>
  );
}

function SeAven({ begrepp, register }: { begrepp: Begrepp; register: Begrepp[] }) {
  const lankar = (begrepp.se_aven ?? [])
    .map((sid) => hittaBegrepp(register, sid))
    .filter((b): b is Begrepp => b !== undefined);
  if (lankar.length === 0) return null;
  return (
    <p className={s.meta}>
      Se även:{" "}
      {lankar.map((b, i) => (
        <span key={b.id}>
          {i > 0 && ", "}
          <a className={s.lank} href={`#/begrepp/${b.id}`}>{b.term}</a>
        </span>
      ))}
    </p>
  );
}
