// figur/Nyckel.tsx: jämförraden under plotytan, "+ Jämför med …" och chips för fästa serier (stilguiden 6.1).
// Ägare: WP4. Stubb från WP0; props är preliminära tills WP4 bestämt dem.

import type { ReactNode } from "react";
import type { ChartSpec } from "../charts/spec";

export interface NyckelProps {
  spec: ChartSpec;
  fasta: string[];
  onFasta(ids: string[]): void;
}

export default function Nyckel(_props: NyckelProps): ReactNode {
  throw new Error("Ej byggd: WP4");
}
