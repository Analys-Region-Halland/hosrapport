// ui/Knapp.tsx: textknapp och menyknapp (stilguiden 5.3).
// Ägare: WP4. Övriga knappattribut (aria-*, data-*, ref) skickas vidare till
// <button>. `ton="fokus"` ger den gröna textknappen "+ Jämför med …".
// `ikon` (tillägg i WP12b) gör menyknappen kvadratisk för en ikon; knappen
// behöver då ett aria-label.

import type { ButtonHTMLAttributes, MouseEvent, ReactNode, Ref } from "react";
import s from "./Knapp.module.css";

export interface KnappProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "className" | "style"> {
  typ?: "text" | "meny";
  ton?: "standard" | "fokus";
  /** Innehållet är en ikon: kvadratisk knapp (menyknappens höjd). */
  ikon?: boolean;
  onClick?(e: MouseEvent<HTMLButtonElement>): void;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export default function Knapp({ typ = "text", ton = "standard", ikon = false, children, ref, ...ovrigt }: KnappProps) {
  const klass = [s.knapp, s[typ], ton === "fokus" ? s.fokus : "", ikon ? s.ikon : ""].filter(Boolean).join(" ");
  return (
    <button type="button" className={klass} ref={ref} {...ovrigt}>
      {children}
    </button>
  );
}
