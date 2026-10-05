// ui/Meny.tsx: menyknapp med val, t.ex. Exportera och Ladda ner (stilguiden 4.5 och 5.3).
// Ägare: WP4. Mönstret "menu button" (WAI-ARIA APG):
// - Knappen har aria-haspopup="menu" och aria-expanded. Klick, Enter, mellanslag
//   eller ↓ öppnar och fokuserar första valet; ↑ öppnar och fokuserar sista.
// - I listan flyttar ↑ ↓ Home End fokus; Enter eller mellanslag väljer.
// - Escape (via lagerstapeln) stänger och lämnar fokus på knappen. Tab eller
//   klick utanför stänger utan att flytta fokus.
// `typ` styr knappens utseende: "meny" (inramad, Exportera) eller "text"
// (figurens Ladda ner). `placering` styr åt vilket håll listan öppnas.

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Knapp from "./Knapp";
import { useLager } from "./lager";
import s from "./Meny.module.css";

export interface MenyProps {
  etikett: string;
  val: { id: string; etikett: string; onVal(): void }[];
  typ?: "text" | "meny";
  placering?: "vanster" | "hoger";
}

export default function Meny({ etikett, val, typ = "meny", placering = "vanster" }: MenyProps) {
  const [oppen, setOppen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const rot = useRef<HTMLDivElement>(null);
  const knapp = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const knappId = useId();
  const listaId = useId();

  const stang = (aterFokus: boolean) => {
    setOppen(false);
    if (aterFokus) knapp.current?.focus();
  };
  useLager(oppen, () => stang(true));

  const oppna = (index: number) => {
    setStartIndex(index);
    setOppen(true);
  };

  // Fokusera valet när listan öppnats.
  useEffect(() => {
    if (!oppen) return;
    const knappar = lista.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    if (!knappar?.length) return;
    knappar[(startIndex + knappar.length) % knappar.length].focus();
  }, [oppen, startIndex]);

  // Klick utanför stänger.
  useEffect(() => {
    if (!oppen) return;
    const vidPekare = (e: PointerEvent) => {
      if (!rot.current?.contains(e.target as Node)) setOppen(false);
    };
    document.addEventListener("pointerdown", vidPekare);
    return () => document.removeEventListener("pointerdown", vidPekare);
  }, [oppen]);

  const vidKnappTangent = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); oppna(0); }
    else if (e.key === "ArrowUp") { e.preventDefault(); oppna(-1); }
  };

  const vidListTangent = (e: KeyboardEvent<HTMLDivElement>) => {
    const knappar = [...(lista.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const i = knappar.indexOf(document.activeElement as HTMLButtonElement);
    let mal = -1;
    if (e.key === "ArrowDown") mal = (i + 1) % knappar.length;
    else if (e.key === "ArrowUp") mal = (i - 1 + knappar.length) % knappar.length;
    else if (e.key === "Home") mal = 0;
    else if (e.key === "End") mal = knappar.length - 1;
    else if (e.key === "Tab") { setOppen(false); return; }
    if (mal < 0) return;
    e.preventDefault();
    knappar[mal].focus();
  };

  return (
    <div ref={rot} className={s.meny} data-meny="">
      <Knapp
        ref={knapp}
        typ={typ}
        id={knappId}
        aria-haspopup="menu"
        aria-expanded={oppen}
        aria-controls={oppen ? listaId : undefined}
        onClick={() => (oppen ? stang(false) : oppna(0))}
        onKeyDown={vidKnappTangent}
      >
        {etikett}
      </Knapp>
      {oppen && (
        <div
          ref={lista}
          id={listaId}
          role="menu"
          aria-labelledby={knappId}
          className={`${s.lista} ${placering === "hoger" ? s.hoger : s.vanster}`}
          onKeyDown={vidListTangent}
        >
          {val.map((v) => (
            <button
              key={v.id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={s.val}
              data-val={v.id}
              onClick={() => { stang(true); v.onVal(); }}
            >
              {v.etikett}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
