// ui/Knapp.tsx: textknapp och menyknapp (stilguiden 5.3).
// Ägare: WP4. Övriga knappattribut (aria-*, data-*, ref) skickas vidare till
// <button>. `ton="fokus"` ger den gröna textknappen "+ Jämför med …".

import type { ButtonHTMLAttributes, MouseEvent, ReactNode, Ref } from "react";
import s from "./Knapp.module.css";

export interface KnappProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "className" | "style"> {
  typ?: "text" | "meny";
  ton?: "standard" | "fokus";
  onClick?(e: MouseEvent<HTMLButtonElement>): void;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export default function Knapp({ typ = "text", ton = "standard", children, ref, ...ovrigt }: KnappProps) {
  const klass = [s.knapp, s[typ], ton === "fokus" ? s.fokus : ""].filter(Boolean).join(" ");
  return (
    <button type="button" className={klass} ref={ref} {...ovrigt}>
      {children}
    </button>
  );
}
