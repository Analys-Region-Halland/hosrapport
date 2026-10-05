// rapport/KapitelSida.tsx: kapitlet (stilguiden 4.3).
// Ägare: WP9. Stubb från WP0; props är preliminära tills WP9 bestämt dem.

import type { ReactNode } from "react";
import type { KapitelModell, VyId } from "../data/modell";

export interface KapitelSidaProps {
  kapitel: KapitelModell;
  vy: VyId;
}

export default function KapitelSida(_props: KapitelSidaProps): ReactNode {
  throw new Error("Ej byggd: WP9");
}
