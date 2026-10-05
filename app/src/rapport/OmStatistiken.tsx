// rapport/OmStatistiken.tsx: blocket Om statistiken (stilguiden 4.3).
// Ägare: WP9. Stubb från WP0; props är preliminära tills WP9 bestämt dem.

import type { ReactNode } from "react";
import type { KapitelModell } from "../data/modell";

export interface OmStatistikenProps {
  kapitel: KapitelModell;
}

export default function OmStatistiken(_props: OmStatistikenProps): ReactNode {
  throw new Error("Ej byggd: WP9");
}
