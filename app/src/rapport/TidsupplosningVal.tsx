// rapport/TidsupplosningVal.tsx: väljaren för tidsupplösning sist i kapitlets
// metarad (stilguiden 4.3 och 5.4). Ägare: WP6.
//
// Textflikar utan ram: typ.roll.not 600 farg.text2, aktiv farg.black med 2 px
// farg.fokus understrykning, höjd 32 px, mellanrum rum.5. Visas bara när det
// finns fler än en tidsupplösning. ARIA tablist/tab: pilarna flyttar fokus,
// Enter eller mellanslag väljer (manuell aktivering, eftersom ett val laddar
// om kapitlet). Rapportsidan (WP9) lägger väljaren i Masthead (children).
//
// Byggs på egen hand tills ui/Flikar (WP4) finns; propsen är desamma, så
// komponenten kan bli ett tunt omslag kring Flikar efter sammanslagningen.

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import type { VyId } from "../data/modell";
import { VYER } from "../nav/route";
import s from "./TidsupplosningVal.module.css";

export interface TidsupplosningValProps {
  vyer: VyId[];
  aktiv: VyId;
  onByt(vy: VyId): void;
}

const VYNAMN: Record<VyId, string> = {
  dag: "Dag",
  vecka: "Vecka",
  manad: "Månad",
  kvartal: "Kvartal",
  ar: "År",
};

export default function TidsupplosningVal({ vyer, aktiv, onByt }: TidsupplosningValProps): ReactNode {
  const lista = useRef<HTMLDivElement>(null);
  const ordnade = VYER.filter((v) => vyer.includes(v));
  if (ordnade.length <= 1) return null;

  const tangent = (e: KeyboardEvent<HTMLDivElement>) => {
    const flikar = Array.from(lista.current?.querySelectorAll<HTMLElement>("[role='tab']") ?? []);
    const i = flikar.indexOf(document.activeElement as HTMLElement);
    const ga = (n: number) => {
      e.preventDefault();
      flikar[(n + flikar.length) % flikar.length]?.focus();
    };
    if (e.key === "ArrowRight") ga(i + 1);
    else if (e.key === "ArrowLeft") ga(i - 1);
    else if (e.key === "Home") ga(0);
    else if (e.key === "End") ga(flikar.length - 1);
  };

  return (
    <div ref={lista} role="tablist" aria-label="Tidsupplösning" className={s.flikar} onKeyDown={tangent} data-tidsupplosning="">
      {ordnade.map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={v === aktiv}
          tabIndex={v === aktiv ? 0 : -1}
          className={s.flik}
          data-vy={v}
          onClick={() => {
            if (v !== aktiv) onByt(v);
          }}
        >
          {VYNAMN[v]}
        </button>
      ))}
    </div>
  );
}
