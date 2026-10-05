// rapport/Positionsrad.tsx: positionsraden "2 Vårdgarantin › 2.3 Väntande till operation" (stilguiden 4.5).
// Ägare: WP6. Stubb från WP0; props är preliminära tills WP6 bestämt dem.

import type { ReactNode } from "react";

export interface PositionsradProps {
  delar: { id: string; text: string }[];
  onOppnaInnehall?(): void;
}

export default function Positionsrad(_props: PositionsradProps): ReactNode {
  throw new Error("Ej byggd: WP6");
}
