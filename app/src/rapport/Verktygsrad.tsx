// rapport/Verktygsrad.tsx: verktygsraden med "← Alla kapitel", positionsraden
// och Exportera (stilguiden 4.5 och 5.3). Ägare: WP6.
//
// Sticky, höjd matt.verktygsrad, farg.papper. En hårlinje under raden visas
// först när sidan rullats. Ryms i 360 px: positionsraden kortas och
// exportmenyn blir en ikon med etikett för skärmläsare (ikonmeny).
//
// Exportmenyn är egen här eftersom ui/Meny (WP4) saknar ikonläge och kryssval
// (Redigeringsläge på/av). Escape går via nav/lager.ts.

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import Lank from "../nav/Lank";
import { registreraLager } from "../nav/lager";
import { START } from "../nav/route";
import s from "./Verktygsrad.module.css";

export interface MenyVal {
  id: string;
  etikett: string;
  /** Kryssval (menuitemcheckbox), t.ex. redigeringsläget. undefined = vanligt val. */
  kryssad?: boolean;
  onVal(): void;
}

export interface VerktygsradProps {
  /** Positionsraden. */
  children?: ReactNode;
  /** Valen i Exportera-menyn. Tom lista = ingen meny. */
  meny?: MenyVal[];
  /** Menyknappen som ikon med etikett för skärmläsare (mobil). */
  ikonmeny?: boolean;
  /** Kort statusmeddelande, t.ex. "Länken är kopierad." Läses upp (role=status). */
  status?: string;
  /** Desktop med innehållsförteckning: raden följer sidans spalter. */
  spalt?: boolean;
  /** Inte sticky och med hårlinje, för den levande stilguiden. */
  statisk?: boolean;
}

// Om sidan är rullad. Bara ett booleskt värde, så raden ritas om när det byts.
const arRullad = () => typeof scrollY !== "undefined" && scrollY > 0;
function prenumereraRullning(f: () => void): () => void {
  addEventListener("scroll", f, { passive: true });
  return () => removeEventListener("scroll", f);
}

export default function Verktygsrad({ children, meny = [], ikonmeny = false, status = "", spalt = false, statisk = false }: VerktygsradProps): ReactNode {
  const rullad = useSyncExternalStore(prenumereraRullning, arRullad, () => false);
  return (
    <header
      className={s.verktygsrad}
      data-verktygsrad=""
      data-rullad={rullad || statisk || undefined}
      data-spalt={spalt || undefined}
      data-statisk={statisk || undefined}
    >
      <div className={s.inre}>
        <Lank till={START} className={s.tillbaka} data-tillbaka="">
          <span aria-hidden="true">←</span>Alla kapitel
        </Lank>
        <div className={s.mitt}>{children}</div>
        {meny.length > 0 && <ExportMeny val={meny} ikon={ikonmeny} />}
      </div>
      <p className={s.status} role="status">{status}</p>
    </header>
  );
}

// ════════════════════════════════════════════════════════════
//  Exportera: menyknapp med val (menu, menuitem, menuitemcheckbox)
// ════════════════════════════════════════════════════════════

function ExportMeny({ val, ikon }: { val: MenyVal[]; ikon: boolean }) {
  const [oppen, setOppen] = useState(false);
  const knapp = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const menyId = useId();

  const stang = useCallback((fokusTillbaka: boolean) => {
    setOppen(false);
    if (fokusTillbaka) knapp.current?.focus();
  }, []);

  // Escape stänger menyn (lagerstapeln), klick utanför stänger utan att flytta fokus
  useEffect(() => {
    if (!oppen) return;
    const taBort = registreraLager(() => stang(true));
    const utanfor = (e: PointerEvent) => {
      const mal = e.target as Node;
      if (!lista.current?.contains(mal) && !knapp.current?.contains(mal)) stang(false);
    };
    document.addEventListener("pointerdown", utanfor, true);
    return () => {
      taBort();
      document.removeEventListener("pointerdown", utanfor, true);
    };
  }, [oppen, stang]);

  // Första valet får fokus när menyn öppnas
  useEffect(() => {
    if (oppen) lista.current?.querySelector<HTMLElement>("[role^='menuitem']")?.focus();
  }, [oppen]);

  const tangent = (e: KeyboardEvent<HTMLDivElement>) => {
    const poster = Array.from(lista.current?.querySelectorAll<HTMLElement>("[role^='menuitem']") ?? []);
    const i = poster.indexOf(document.activeElement as HTMLElement);
    const ga = (n: number) => {
      e.preventDefault();
      poster[(n + poster.length) % poster.length]?.focus();
    };
    if (e.key === "ArrowDown") ga(i + 1);
    else if (e.key === "ArrowUp") ga(i - 1);
    else if (e.key === "Home") ga(0);
    else if (e.key === "End") ga(poster.length - 1);
    else if (e.key === "Tab") stang(false);
  };

  return (
    <div className={s.meny}>
      <button
        ref={knapp}
        type="button"
        className={s.menyknapp}
        data-ikon={ikon || undefined}
        aria-haspopup="menu"
        aria-expanded={oppen}
        aria-controls={oppen ? menyId : undefined}
        aria-label={ikon ? "Exportera" : undefined}
        onClick={() => setOppen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !oppen) {
            e.preventDefault();
            setOppen(true);
          }
        }}
        data-exportera=""
      >
        {ikon ? (
          <svg className={s.ikon} viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 10.5V2.5M5 5.5l3-3 3 3M3 9v4.5h10V9" />
          </svg>
        ) : (
          "Exportera"
        )}
      </button>
      {oppen && (
        <div ref={lista} id={menyId} role="menu" aria-label="Exportera" className={s.menylista} onKeyDown={tangent} data-exportmeny="">
          {val.map((v) => (
            <button
              key={v.id}
              type="button"
              role={v.kryssad === undefined ? "menuitem" : "menuitemcheckbox"}
              aria-checked={v.kryssad}
              tabIndex={-1}
              className={s.menyval}
              data-menyval={v.id}
              onClick={() => {
                stang(true);
                v.onVal();
              }}
            >
              <span>{v.etikett}</span>
              {v.kryssad !== undefined && (
                <span className={s.lage} aria-hidden="true">{v.kryssad ? "på" : "av"}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
