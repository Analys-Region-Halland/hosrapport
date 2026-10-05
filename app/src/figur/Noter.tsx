// figur/Noter.tsx: figurens noter, "Not: …" (stilguiden 6.1).
// Ägare: WP4. Stubb från WP0; props är preliminära tills WP4 bestämt dem.

import type { ReactNode } from "react";
import type { Not } from "../data/modell";

export interface NoterProps {
  noter: Not[];
}

export default function Noter(_props: NoterProps): ReactNode {
  throw new Error("Ej byggd: WP4");
}
