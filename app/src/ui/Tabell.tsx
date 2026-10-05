// ui/Tabell.tsx: tabell enligt stilguiden 5.8 och 5.9.
// Ägare: WP4. Stubb från WP0; props är preliminära tills WP4 bestämt dem.

import type { ReactNode } from "react";

export interface TabellProps {
  caption: string;
  kolumner: string[];
  rader: (string | number | null)[][];
  fokusRad?: number;
}

export default function Tabell(_props: TabellProps): ReactNode {
  throw new Error("Ej byggd: WP4");
}
