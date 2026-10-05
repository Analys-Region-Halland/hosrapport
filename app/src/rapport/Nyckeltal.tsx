// rapport/Nyckeltal.tsx: nyckeltalsraden "87,7 % · plats 8 av 21 · 2024" (stilguiden 4.4 och 5.2).
// Ägare: WP9. Stubb från WP0; props är preliminära tills WP9 bestämt dem.

import type { ReactNode } from "react";
import type { KpiModell } from "../data/modell";

export interface NyckeltalProps {
  kpi: KpiModell;
}

export default function Nyckeltal(_props: NyckeltalProps): ReactNode {
  throw new Error("Ej byggd: WP9");
}
