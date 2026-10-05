// ui/Meny.tsx: menyknapp med val, t.ex. Exportera och Ladda ner (stilguiden 4.5 och 5.3).
// Ägare: WP4. Mönstret "menu button" (WAI-ARIA APG) i WP5:s ui/Popover:
// - Knappen har aria-haspopup="menu" och aria-expanded. Klick, Enter, mellanslag
//   eller ↓ öppnar och fokuserar första valet; ↑ öppnar och fokuserar sista.
// - I listan flyttar ↑ ↓ Home End fokus; Enter eller mellanslag väljer.
// - Popovern sköter resten: portal (klipps inte av content-visibility eller
//   overflow runt figuren), Escape via lagerstapeln med fokus tillbaka till
//   knappen, klick utanför, Tab vidare till nästa element efter knappen.
//   Skift+Tab stänger och lämnar fokus på knappen.
// `typ` styr knappens utseende: "meny" (inramad, Exportera) eller "text"
// (figurens Ladda ner).

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Knapp from "./Knapp";
import Popover from "./Popover";
import s from "./Meny.module.css";

export interface MenyProps {
  etikett: string;
  val: { id: string; etikett: string; onVal(): void }[];
  typ?: "text" | "meny";
}

export default function Meny({ etikett, val, typ = "meny" }: MenyProps) {
  const [oppen, setOppen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [knapp, setKnapp] = useState<HTMLButtonElement | null>(null);
  const lista = useRef<HTMLDivElement>(null);
  const knappId = useId();
  const ytaId = useId();

  const oppna = (index: number) => {
    setStartIndex(index);
    setOppen(true);
  };

  // Fokusera valet när listan öppnats. Popovern fokuserar sin yta i en effekt;
  // nästa bildruta kommer efter alla effekter, även StrictModes omkörning.
  useEffect(() => {
    if (!oppen) return;
    const r = requestAnimationFrame(() => {
      const knappar = lista.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
      if (knappar?.length) knappar[(startIndex + knappar.length) % knappar.length].focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(r);
  }, [oppen, startIndex]);

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
    else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      setOppen(false);
      knapp?.focus();
      return;
    }
    if (mal < 0) return;
    e.preventDefault();
    knappar[mal].focus();
  };

  return (
    <div className={s.meny} data-meny="">
      <Knapp
        ref={setKnapp}
        typ={typ}
        id={knappId}
        aria-haspopup="menu"
        aria-expanded={oppen}
        aria-controls={oppen ? ytaId : undefined}
        onClick={() => (oppen ? setOppen(false) : oppna(0))}
        onKeyDown={vidKnappTangent}
      >
        {etikett}
      </Knapp>
      <Popover oppen={oppen} onStang={() => setOppen(false)} ankare={knapp} etikett={etikett} id={ytaId}>
        <div ref={lista} role="menu" aria-labelledby={knappId} className={s.lista} onKeyDown={vidListTangent}>
          {val.map((v) => (
            <button
              key={v.id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={s.val}
              data-val={v.id}
              onClick={() => { setOppen(false); v.onVal(); }}
            >
              {v.etikett}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}
