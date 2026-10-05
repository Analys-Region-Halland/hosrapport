// ui/Flikar.tsx: textflikar med tablist och tab (stilguiden 5.4).
// Ägare: WP4. Stubb från WP0; props är preliminära tills WP4 bestämt dem.

import type { ReactNode } from "react";

export interface FlikarProps {
  flikar: { id: string; etikett: string }[];
  aktiv: string;
  onByt(id: string): void;
  etikett: string;          // tillgängligt namn för fliklistan
}

export default function Flikar(_props: FlikarProps): ReactNode {
  throw new Error("Ej byggd: WP4");
}
