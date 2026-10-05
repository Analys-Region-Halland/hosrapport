// figur/Atgarder.tsx: figurens åtgärder Tabell, Ladda ner och Förstora (stilguiden 6.1 och 6.8).
// Ägare: WP4. Stubb från WP0; props är preliminära tills WP4 bestämt dem.

import type { ReactNode } from "react";

export interface AtgarderProps {
  atgarder: ("tabell" | "ladda" | "forstora")[];
  tabellVisas: boolean;
  onTabell(): void;
  onLadda(format: "csv" | "svg" | "png"): void;
  onForstora(): void;
}

export default function Atgarder(_props: AtgarderProps): ReactNode {
  throw new Error("Ej byggd: WP4");
}
