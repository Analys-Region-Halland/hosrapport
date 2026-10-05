// rapport/Indikator.tsx: en indikator: rubrikrad, nyckeltal, analys, figur, fördjupning (stilguiden 4.4).
// Ägare: WP9. Stubb från WP0; props är preliminära tills WP9 bestämt dem.

import type { ReactNode } from "react";
import type { KapitelModell, KpiModell } from "../data/modell";

export interface IndikatorProps {
  kpi: KpiModell;
  kapitel: KapitelModell;
  nummer: string;
}

export default function Indikator(_props: IndikatorProps): ReactNode {
  throw new Error("Ej byggd: WP9");
}
