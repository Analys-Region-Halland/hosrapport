// figur/Forstoring.tsx: förstoringen som dialog med fokusfälla (stilguiden 6.8).
// Ägare: WP4. Stubb från WP0; props är preliminära tills WP4 bestämt dem.

import type { ReactNode } from "react";

export interface ForstoringProps {
  oppen: boolean;
  onStang(): void;
  children: ReactNode;
}

export default function Forstoring(_props: ForstoringProps): ReactNode {
  throw new Error("Ej byggd: WP4");
}
