// nav/Lank.tsx: länk till en adress i rapporten. Ägare: WP6.
//
// href byggs med format(), så länken fungerar som vanlig länk (ny flik,
// kopiera länkadress, mellanklick). Ett vanligt vänsterklick navigerar inom
// appen med navigera(): pushState, rullning till blocket och fokus dit.

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { format, type Route } from "./route";
import { navigera } from "./useRoute";

export interface LankProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  till: Route;
  /** replaceState i stället för pushState. */
  ersatt?: boolean;
  children: ReactNode;
}

export default function Lank({ till, ersatt, onClick, children, ...rest }: LankProps): ReactNode {
  const klick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.target && rest.target !== "_self") return;
    e.preventDefault();
    navigera(till, { ersatt });
  };
  return (
    <a {...rest} href={format(till)} onClick={klick}>
      {children}
    </a>
  );
}
