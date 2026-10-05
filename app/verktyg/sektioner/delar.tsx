// delar.tsx: gemensamma byggstenar för stilguidens sektioner, så att alla
// paket visar sina prov på samma sätt: dek, rubriker, prosa, not, tabell,
// statuschip och en felgräns per sektion. Ägare: WP7.
//
// En sektion är en fil verktyg/sektioner/{namn}.stilguide.tsx som exporterar
//   export const id = "diagram";          // ankare och bildnamn i bänken
//   export const rubrik = "Diagram";      // h2 och innehållsförteckning
//   export const ordning = 61;            // stilguidens avsnitt × 10 (6.1 → 61)
//   export function Sektion() { … }       // innehållet under h2
// Stilguiden globbar filerna; det finns ingen delad indexfil. Inne i en sektion:
// h3 (Underrubrik) för delar, h4 (Blockrubrik) under dem, figurer med
// rubrikniva={4}. Element med data-bank-bild="namn" får en egen bild i bänken.

import { Component, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import type { Status } from "../../src/data/modell";
import s from "./delar.module.css";

export interface SektionModul {
  id: string;
  rubrik: string;
  ordning: number;
  Sektion: ComponentType;
}

/** Sektionens dek: en till två meningar under h2 (typ.roll.ingress, farg.text2). */
export function Dek({ children }: { children: ReactNode }) {
  return <p className={s.dek}>{children}</p>;
}

/** Underrubrik inne i en sektion (h3, typ.roll.indikator). */
export function Underrubrik({ id, children }: { id?: string; children: ReactNode }) {
  return <h3 id={id} className={s.underrubrik}>{children}</h3>;
}

/** Blockrubrik under en underrubrik (h4, typ.roll.figurtitel). */
export function Blockrubrik({ children }: { children: ReactNode }) {
  return <h4 className={s.blockrubrik}>{children}</h4>;
}

/** Löptext (typ.roll.brod, högst matt.text). */
export function Prosa({ children }: { children: ReactNode }) {
  return <p className={s.prosa}>{children}</p>;
}

/** Not (typ.roll.not, farg.text3). */
export function Not({ children }: { children: ReactNode }) {
  return <p className={s.not}>{children}</p>;
}

/** Tokennamn eller sökväg i löptext. Sans, inte mono (stilguiden 2.4: två familjer). */
export function Kod({ children }: { children: ReactNode }) {
  return <code className={s.kod}>{children}</code>;
}

/** Ruta för avvikelser mellan tema.ts och stilguiden, eller andra fynd. Ingen statusfärg. */
export function Notis({ rubrik, children }: { rubrik: string; children: ReactNode }) {
  return (
    <div className={s.notis} role="note">
      <p className={s.notisRubrik}>{rubrik}</p>
      {children}
    </div>
  );
}

export interface TabellProps {
  caption: string;
  kolumner: string[];
  rader: ReactNode[][];
  /** Index för kolumner med tal: högerställda, tabulära siffror. */
  tal?: number[];
  /** Visa captionen bara för skärmläsare (när en rubrik redan står ovanför). */
  doldCaption?: boolean;
}

/** Tabell enligt stilguiden 5.9: huvud i not 600, hårlinje mellan rader, tal högerställda. */
export function Tabell({ caption, kolumner, rader, tal = [], doldCaption }: TabellProps) {
  return (
    <table className={s.tabell}>
      <caption className={doldCaption ? "visuellt-dold" : s.caption}>{caption}</caption>
      <thead>
        <tr>{kolumner.map((k, i) => <th key={k} scope="col" className={tal.includes(i) ? s.tal : undefined}>{k}</th>)}</tr>
      </thead>
      <tbody>
        {rader.map((rad, r) => (
          <tr key={r}>{rad.map((c, i) => <td key={i} className={tal.includes(i) ? s.tal : undefined}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

/** Statuschip ur tokens (farg.status.*.text på .botten, komponent.statusmarkor). Visar tokens, inte WP4:s komponent. */
export function StatusChip({ status, etikett }: { status: Status; etikett: string }) {
  return (
    <span className={s.chip} style={{ color: `var(--farg-status-${status}-text)`, background: `var(--farg-status-${status}-botten)` }}>
      {etikett}
    </span>
  );
}

/** Statusprick (farg.status.*.markor, komponent.tocPrick). */
export function StatusPrick({ status }: { status: Status }) {
  return <span className={s.prick} style={{ background: `var(--farg-status-${status}-markor)` }} aria-hidden="true" />;
}

/** Fångar fel i en sektion så att resten av stilguiden ritas. */
export class Felgrans extends Component<{ namn: string; children: ReactNode }, { fel: Error | null }> {
  state = { fel: null as Error | null };
  static getDerivedStateFromError(fel: Error) {
    return { fel };
  }
  componentDidCatch(fel: Error, info: ErrorInfo) {
    console.error(`Sektionen ${this.props.namn} kunde inte ritas`, fel, info.componentStack);
  }
  render() {
    if (!this.state.fel) return this.props.children;
    return (
      <Notis rubrik={`Sektionen ${this.props.namn} kunde inte ritas`}>
        <p className={s.notisText}>{this.state.fel.message}</p>
      </Notis>
    );
  }
}
