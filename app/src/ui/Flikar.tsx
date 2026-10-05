// ui/Flikar.tsx: textflikar med tablist och tab (stilguiden 5.4).
// Ägare: WP4. Visas bara när det finns mer än ett val. Tangentbord enligt
// stilguiden: pilarna (och Home/End) flyttar fokus, Enter eller mellanslag
// väljer. Den valda fliken är den enda i tabbordningen.
//
// `panel` är id för den panel flikarna styr. Då får varje flik id
// `{panel}-flik-{id}` och aria-controls, så att panelen kan märkas med
// aria-labelledby={`${panel}-flik-${aktiv}`}.

import { useId, useRef, type KeyboardEvent } from "react";
import s from "./Flikar.module.css";

export interface FlikarProps {
  flikar: { id: string; etikett: string }[];
  aktiv: string;
  onByt(id: string): void;
  etikett: string;          // tillgängligt namn för fliklistan
  panel?: string;           // id för panelen som flikarna styr
}

function flikId(panel: string, id: string): string {
  return `${panel}-flik-${id}`;
}

export default function Flikar({ flikar, aktiv, onByt, etikett, panel }: FlikarProps) {
  const egetId = useId();
  const lista = useRef<HTMLDivElement>(null);
  if (flikar.length < 2) return null;
  const bas = panel ?? egetId;

  const vidTangent = (e: KeyboardEvent<HTMLDivElement>) => {
    const knappar = [...(lista.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])];
    const i = knappar.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    let mal = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") mal = (i + 1) % knappar.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") mal = (i - 1 + knappar.length) % knappar.length;
    else if (e.key === "Home") mal = 0;
    else if (e.key === "End") mal = knappar.length - 1;
    if (mal < 0) return;
    e.preventDefault();
    knappar[mal].focus();
  };

  return (
    <div ref={lista} role="tablist" aria-label={etikett} className={s.lista} onKeyDown={vidTangent} data-flikar="">
      {flikar.map((f) => {
        const vald = f.id === aktiv;
        return (
          <button
            key={f.id}
            type="button"
            role="tab"
            id={flikId(bas, f.id)}
            aria-selected={vald}
            aria-controls={panel}
            tabIndex={vald ? 0 : -1}
            className={s.flik}
            onClick={() => { if (!vald) onByt(f.id); }}
            data-flik={f.id}
          >
            {f.etikett}
          </button>
        );
      })}
    </div>
  );
}
