// ui/Knapp.tsx: textknapp och menyknapp (stilguiden 5.3).
// Ägare: WP4. Stubb från WP0; props är preliminära tills WP4 bestämt dem.

import type { ReactNode } from "react";

export interface KnappProps {
  typ?: "text" | "meny";
  onClick?(): void;
  children: ReactNode;
}

export default function Knapp(_props: KnappProps): ReactNode {
  throw new Error("Ej byggd: WP4");
}
