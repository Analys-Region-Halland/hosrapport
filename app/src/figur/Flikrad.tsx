// figur/Flikrad.tsx: vyval och nivåval på figurens titelrad (stilguiden 5.4 och 6.1).
// Ägare: WP4. Stubb från WP0; props är preliminära tills WP4 bestämt dem.

import type { ReactNode } from "react";

export interface FlikradProps {
  flikar: { id: string; etikett: string }[];
  aktiv: string;
  onByt(id: string): void;
  etikett: string;          // tillgängligt namn för fliklistan
}

export default function Flikrad(_props: FlikradProps): ReactNode {
  throw new Error("Ej byggd: WP4");
}
