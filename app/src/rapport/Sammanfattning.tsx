// rapport/Sammanfattning.tsx: sammanfattningssidan (stilguiden 4.2).
// Ägare: WP9. Stubb från WP0; props är preliminära tills WP9 bestämt dem.

import type { ReactNode } from "react";
import type { KapitelModell, VyId } from "../data/modell";

export interface SammanfattningProps {
  kapitel: KapitelModell[];
  vy: VyId;
}

export default function Sammanfattning(_props: SammanfattningProps): ReactNode {
  throw new Error("Ej byggd: WP9");
}
