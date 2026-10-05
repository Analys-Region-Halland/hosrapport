// rapport/DetViktigaste.tsx: blocket Det viktigaste, högst sex punkter (stilguiden 3.4).
// Ägare: WP9. Stubb från WP0; props är preliminära tills WP9 bestämt dem.

import type { ReactNode } from "react";
import type { Huvudpunkt } from "../data/modell";

export interface DetViktigasteProps {
  punkter: Huvudpunkt[];
}

export default function DetViktigaste(_props: DetViktigasteProps): ReactNode {
  throw new Error("Ej byggd: WP9");
}
