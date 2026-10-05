// figur/TabellVy.tsx: figurens tabellvy, en riktig <table> med <caption> (stilguiden 5.9).
// Ägare: WP4. Stubb från WP0; props är preliminära tills WP4 bestämt dem.

import type { ReactNode } from "react";
import type { ChartSpec } from "../charts/spec";

export interface TabellVyProps {
  tabell: ChartSpec["tabell"];
}

export default function TabellVy(_props: TabellVyProps): ReactNode {
  throw new Error("Ej byggd: WP4");
}
