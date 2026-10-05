// ui/Dialog.tsx: modal dialog med fokusfälla (stilguiden 6.8 och 7).
// Ägare: WP4.
//
// - role="dialog", aria-modal och tillgängligt namn (etikett).
// - Renderas i document.body; allt annat i body blir `inert` medan dialogen är
//   öppen, så att klick och Tab inte når sidan bakom.
// - Fokusfälla: Tab och Skift+Tab cirkulerar bland dialogens fokuserbara element.
// - Escape via lagerstapeln (ui/lager.ts, ui/lagerLokal.ts): stänger bara det
//   översta lagret, t.ex. en öppen meny eller popover i dialogen före dialogen.
//   Klick på bakgrunden stänger inte: ett klick som stänger en popover i
//   dialogen ska inte också stänga dialogen. Stäng-knappen och Escape räcker.
// - Fokus återgår till elementet som hade fokus när dialogen öppnades.

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Knapp from "./Knapp";
import { useLager } from "./lager";
import s from "./Dialog.module.css";

export interface DialogProps {
  oppen: boolean;
  onStang(): void;
  etikett: string;
  children: ReactNode;
}

const FOKUSERBARA = [
  "a[href]", "area[href]", "button:not([disabled])", "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])", "textarea:not([disabled])", "iframe", "summary",
  "[contenteditable='true']", "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Synliga, fokuserbara element i tabbordning inom `rot`. */
function fokuserbara(rot: HTMLElement): HTMLElement[] {
  return [...rot.querySelectorAll<HTMLElement>(FOKUSERBARA)].filter((el) => {
    if (el.tabIndex < 0 || el.closest("[inert]")) return false;
    return getComputedStyle(el).visibility !== "hidden" && el.getClientRects().length > 0;
  });
}

export default function Dialog({ oppen, onStang, etikett, children }: DialogProps) {
  if (!oppen || typeof document === "undefined") return null;
  return createPortal(<OppenDialog onStang={onStang} etikett={etikett}>{children}</OppenDialog>, document.body);
}

function OppenDialog({ onStang, etikett, children }: Omit<DialogProps, "oppen">) {
  const yta = useRef<HTMLDivElement>(null);
  useLager(true, onStang);

  // Fokus in vid öppning och tillbaka vid stängning; sidan bakom blir inert.
  useEffect(() => {
    const forra = document.activeElement as HTMLElement | null;
    const behallare = yta.current?.closest<HTMLElement>("[data-dialog-rot]");
    const andra = [...document.body.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== behallare && !el.inert,
    );
    andra.forEach((el) => { el.inert = true; });
    const rot = document.documentElement;
    const overflow = rot.style.overflow;
    rot.style.overflow = "hidden";
    yta.current?.focus();
    return () => {
      andra.forEach((el) => { el.inert = false; });
      rot.style.overflow = overflow;
      if (forra && forra.isConnected) forra.focus();
    };
  }, []);

  const vidTangent = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !yta.current) return;
    const lista = fokuserbara(yta.current);
    if (lista.length === 0) { e.preventDefault(); yta.current.focus(); return; }
    const forsta = lista[0];
    const sista = lista[lista.length - 1];
    const aktiv = document.activeElement as HTMLElement | null;
    const inne = aktiv ? lista.includes(aktiv) : false;
    if (e.shiftKey && (aktiv === forsta || !inne)) { e.preventDefault(); sista.focus(); }
    else if (!e.shiftKey && (aktiv === sista || !inne)) { e.preventDefault(); forsta.focus(); }
  };

  return (
    <div className={s.bakgrund} data-dialog-rot="">
      <div
        ref={yta}
        className={s.yta}
        role="dialog"
        aria-modal="true"
        aria-label={etikett}
        tabIndex={-1}
        onKeyDown={vidTangent}
        data-dialog=""
      >
        <div className={s.huvud}>
          <Knapp onClick={onStang} data-stang="">Stäng</Knapp>
        </div>
        {children}
      </div>
    </div>
  );
}
