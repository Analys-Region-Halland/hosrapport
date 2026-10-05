// ui/Popover.tsx: popover för begrepp och jämför-listan (stilguiden 5.7, 6.8 och 7).
// Ägare: WP5.
//
// Beteende
// - Renderas i en portal i <body> och placeras under ankaret (över om det inte
//   får plats), inom fönstret. Portalen gör att popovern inte klipps av
//   `overflow` eller `content-visibility` i omgivande block.
// - Fokus flyttas in i popovern när den öppnas. Tab från sista elementet stänger
//   och går vidare till nästa element efter ankaret; Skift+Tab från början
//   stänger och lämnar fokus på ankaret. Så hamnar popovern i tabbordningen
//   direkt efter ankaret, trots portalen.
// - Escape (via lagerstapeln) och samma knapp stänger, och fokus återgår till
//   ankaret. Klick utanför stänger bara det översta lagret; landar klicket på
//   något som inte kan ta fokus återgår fokus till ankaret.
// - Ingen skugga, 1 px ram, opacitet in på rorelse.kort (stängs av med
//   prefers-reduced-motion via CSS-variabeln).

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { tema } from "../design/tema";
import { FOKUSERBAR, fokuseraEfter, tabbara } from "./fokus";
import { arOverst, registreraLager } from "./lagerLokal";
import s from "./Popover.module.css";

export interface PopoverProps {
  oppen: boolean;
  onStang(): void;
  ankare: HTMLElement | null;
  children: ReactNode;
  /** Tillgängligt namn (aria-label), t.ex. begreppets term. */
  etikett?: string;
  /** id för elementet som beskriver innehållet (aria-describedby). */
  beskrivningId?: string;
  /** id på popovern, för aria-controls på ankaret. */
  id?: string;
}

export default function Popover(props: PopoverProps): ReactNode {
  if (!props.oppen || !props.ankare || typeof document === "undefined") return null;
  return createPortal(<PopoverYta {...props} ankare={props.ankare} />, document.body);
}

function PopoverYta({ onStang, ankare, children, etikett, beskrivningId, id }: PopoverProps & { ankare: HTMLElement }) {
  const ref = useRef<HTMLDivElement>(null);
  const [plats, setPlats] = useState<{ top: number; left: number } | null>(null);
  const onStangRef = useRef(onStang);
  useLayoutEffect(() => { onStangRef.current = onStang; });

  const stang = useCallback((aterfokus: boolean) => {
    onStangRef.current();
    if (aterfokus) ankare.focus({ preventScroll: true });
  }, [ankare]);
  const stangMedEscape = useCallback(() => stang(true), [stang]);

  // Placering i dokumentkoordinater: under ankaret, annars över; alltid inom fönstret.
  useLayoutEffect(() => {
    const placera = () => {
      const el = ref.current;
      if (!el) return;
      const a = ankare.getBoundingClientRect();
      const p = el.getBoundingClientRect();
      const kant = tema.rum[4];
      const glapp = tema.rum[2];
      const bredd = document.documentElement.clientWidth;
      const hojd = window.innerHeight;
      const left = Math.max(kant, Math.min(a.left, bredd - kant - p.width));
      let top = a.bottom + glapp;
      if (top + p.height > hojd - kant && a.top - glapp - p.height >= kant) top = a.top - glapp - p.height;
      setPlats({ top: top + window.scrollY, left: left + window.scrollX });
    };
    placera();
    window.addEventListener("resize", placera);
    window.addEventListener("scroll", placera, true);
    return () => {
      window.removeEventListener("resize", placera);
      window.removeEventListener("scroll", placera, true);
    };
  }, [ankare]);

  // Fokus in vid öppning. Stängs popovern medan fokus är i den återgår fokus till ankaret.
  useEffect(() => {
    const el = ref.current;
    el?.focus({ preventScroll: true });
    return () => {
      const aktiv = document.activeElement;
      if (!aktiv || aktiv === document.body || (el && el.contains(aktiv))) ankare.focus({ preventScroll: true });
    };
  }, [ankare]);

  // Escape via lagerstapeln.
  useEffect(() => registreraLager(stangMedEscape), [stangMedEscape]);

  // Klick utanför stänger det översta lagret.
  useEffect(() => {
    const vidPekare = (e: PointerEvent) => {
      const mal = e.target as Node | null;
      if (!mal || ref.current?.contains(mal) || ankare.contains(mal)) return;
      if (!arOverst(stangMedEscape)) return;
      stang(false);
      if (!(mal instanceof Element && mal.closest(FOKUSERBAR))) {
        window.addEventListener("click", () => {
          if (document.activeElement === document.body) ankare.focus({ preventScroll: true });
        }, { once: true, capture: true });
      }
    };
    document.addEventListener("pointerdown", vidPekare, true);
    return () => document.removeEventListener("pointerdown", vidPekare, true);
  }, [ankare, stang, stangMedEscape]);

  const vidTangent = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !ref.current) return;
    const lista = tabbara(ref.current);
    const aktiv = document.activeElement;
    if (e.shiftKey && (aktiv === ref.current || aktiv === lista[0])) {
      e.preventDefault();
      stang(true);
    } else if (!e.shiftKey && (lista.length === 0 || aktiv === lista[lista.length - 1])) {
      e.preventDefault();
      const yta = ref.current;
      stang(false);
      fokuseraEfter(ankare, yta);
    }
  };

  return (
    <div
      ref={ref}
      id={id}
      role="dialog"
      aria-label={etikett}
      aria-describedby={beskrivningId}
      tabIndex={-1}
      className={s.popover}
      style={plats ? { top: plats.top, left: plats.left } : { visibility: "hidden" }}
      onKeyDown={vidTangent}
      data-popover=""
    >
      {children}
    </div>
  );
}
