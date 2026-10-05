// rapport/Avsnitt.tsx: ett avsnitt med nummer, rubrik, dek och indikatorer (stilguiden 4.3).
// Ägare: WP9. Stubb från WP0; props är preliminära tills WP9 bestämt dem.

import type { ReactNode } from "react";
import type { AvsnittModell } from "../data/modell";

export interface AvsnittProps {
  avsnitt: AvsnittModell;
  nummer: string;
  children: ReactNode;
}

export default function Avsnitt(_props: AvsnittProps): ReactNode {
  throw new Error("Ej byggd: WP9");
}
