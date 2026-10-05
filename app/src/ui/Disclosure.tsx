// ui/Disclosure.tsx: fördjupning som <details> (stilguiden 5.5).
// Ägare: WP4. Ett riktigt <details>, så att webbläsarens sök i sidan öppnar
// det. Vid utskrift öppnas det (beforeprint) och återställs efteråt; CSS-regeln
// för ::details-content täcker webbläsare som stöder den.

import { useEffect, useRef, type ReactNode } from "react";
import s from "./Disclosure.module.css";

export interface DisclosureProps {
  summering: string;
  oppen?: boolean;          // öppen från början
  onToggle?(oppen: boolean): void;
  children: ReactNode;
}

export default function Disclosure({ summering, oppen = false, onToggle, children }: DisclosureProps) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    let oppnadForUtskrift = false;
    const fore = () => {
      const el = ref.current;
      if (el && !el.open) { el.open = true; oppnadForUtskrift = true; }
    };
    const efter = () => {
      if (oppnadForUtskrift && ref.current) ref.current.open = false;
      oppnadForUtskrift = false;
    };
    window.addEventListener("beforeprint", fore);
    window.addEventListener("afterprint", efter);
    return () => {
      window.removeEventListener("beforeprint", fore);
      window.removeEventListener("afterprint", efter);
    };
  }, []);

  return (
    <details
      ref={ref}
      className={s.details}
      open={oppen || undefined}
      onToggle={(e) => onToggle?.(e.currentTarget.open)}
      data-fordjupning=""
    >
      <summary className={s.summering}>{summering}</summary>
      <div className={s.innehall}>{children}</div>
    </details>
  );
}
