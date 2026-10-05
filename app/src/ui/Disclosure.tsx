// ui/Disclosure.tsx: fördjupning som <details> (stilguiden 5.5).
// Ägare: WP4. Stubb från WP0; props är preliminära tills WP4 bestämt dem.

import type { ReactNode } from "react";

export interface DisclosureProps {
  summering: string;
  oppen?: boolean;
  children: ReactNode;
}

export default function Disclosure(_props: DisclosureProps): ReactNode {
  throw new Error("Ej byggd: WP4");
}
