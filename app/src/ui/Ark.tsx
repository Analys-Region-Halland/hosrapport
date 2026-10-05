// ui/Ark.tsx: ark från skärmens nederkant under 640 px (stilguiden 5.7 och 7).
// Ägare: WP5.
//
// Beteende
// - Modal dialog (role="dialog", aria-modal) i en portal i <body>, fäst mot
//   fönstrets nederkant i full bredd. Rubriken är `etikett`, stängknappen är
//   44 px (komponent.ark.stangknapp).
// - Fokus flyttas in i arket och hålls där (Tab och Skift+Tab cirkulerar).
// - Escape (via lagerstapeln), stängknappen och klick utanför stänger. Fokus
//   återgår till ankaret, eller till det element som hade fokus när arket
//   öppnades. Klick utanför stänger bara det översta lagret.
// - Ingen skugga och ingen nedtoning av sidan; en hårlinje skiljer arket från
//   sidan. Opacitet in på rorelse.kort.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FOKUSERBAR, tabbara } from "./fokus";
import { arOverst, registreraLager } from "./lagerLokal";
import s from "./Ark.module.css";

export interface ArkProps {
  oppen: boolean;
  onStang(): void;
  etikett: string;
  children: ReactNode;
  /** Elementet som öppnade arket. Får fokus när arket stängs och räknas inte
   *  som "utanför" (så att samma knapp kan stänga). */
  ankare?: HTMLElement | null;
  /** id på arket, för aria-controls på ankaret. */
  id?: string;
}

export default function Ark(props: ArkProps): ReactNode {
  if (!props.oppen || typeof document === "undefined") return null;
  return createPortal(<ArkYta {...props} />, document.body);
}

function ArkYta({ onStang, etikett, children, ankare, id }: ArkProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rubrikId = useId();
  const tidigare = useRef<HTMLElement | null>(null);
  const onStangRef = useRef(onStang);
  useLayoutEffect(() => { onStangRef.current = onStang; });

  const aterstall = useCallback(() => {
    tidigare.current?.focus({ preventScroll: true });
  }, []);
  const stang = useCallback((aterfokus: boolean) => {
    onStangRef.current();
    if (aterfokus) aterstall();
  }, [aterstall]);
  const stangMedEscape = useCallback(() => stang(true), [stang]);

  // Fokus in vid öppning och tillbaka vid stängning (om fokus fortfarande är i arket).
  useEffect(() => {
    const el = ref.current;
    const fore = document.activeElement;
    tidigare.current = ankare ?? (fore instanceof HTMLElement && fore !== document.body ? fore : null);
    el?.focus({ preventScroll: true });
    return () => {
      const aktiv = document.activeElement;
      if (!aktiv || aktiv === document.body || (el && el.contains(aktiv))) tidigare.current?.focus({ preventScroll: true });
    };
  }, [ankare]);

  useEffect(() => registreraLager(stangMedEscape), [stangMedEscape]);

  useEffect(() => {
    const vidPekare = (e: PointerEvent) => {
      const mal = e.target as Node | null;
      if (!mal || ref.current?.contains(mal) || ankare?.contains(mal)) return;
      if (!arOverst(stangMedEscape)) return;
      stang(false);
      if (!(mal instanceof Element && mal.closest(FOKUSERBAR))) {
        // Fokus återgår efter klicket, om klicket inte gav något annat element fokus.
        const efterKlick = () => {
          if (document.activeElement === document.body) aterstall();
        };
        window.addEventListener("click", efterKlick, { once: true, capture: true });
        setTimeout(() => window.removeEventListener("click", efterKlick, true), 1000);
      }
    };
    document.addEventListener("pointerdown", vidPekare, true);
    return () => document.removeEventListener("pointerdown", vidPekare, true);
  }, [ankare, stang, stangMedEscape, aterstall]);

  // Fokusfälla: Tab och Skift+Tab cirkulerar inom arket.
  const vidTangent = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !ref.current) return;
    e.stopPropagation();
    const lista = tabbara(ref.current);
    if (lista.length === 0) { e.preventDefault(); return; }
    const aktiv = document.activeElement;
    const forsta = lista[0];
    const sista = lista[lista.length - 1];
    if (e.shiftKey && (aktiv === forsta || aktiv === ref.current)) {
      e.preventDefault();
      sista.focus();
    } else if (!e.shiftKey && aktiv === sista) {
      e.preventDefault();
      forsta.focus();
    }
  };

  return (
    <div
      ref={ref}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-labelledby={rubrikId}
      tabIndex={-1}
      className={s.ark}
      onKeyDown={vidTangent}
      data-ark=""
    >
      <div className={s.huvud}>
        <h2 id={rubrikId} className={s.rubrik}>{etikett}</h2>
        <button type="button" className={s.stang} onClick={() => stang(true)}>Stäng</button>
      </div>
      <div className={s.innehall}>{children}</div>
    </div>
  );
}
