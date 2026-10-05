// ui/Meny.tsx: menyknapp med val, t.ex. Exportera och Ladda ner (stilguiden 4.5 och 5.3).
// Ägare: WP4. Stubb från WP0; props är preliminära tills WP4 bestämt dem.

import type { ReactNode } from "react";

export interface MenyProps {
  etikett: string;
  val: { id: string; etikett: string; onVal(): void }[];
}

export default function Meny(_props: MenyProps): ReactNode {
  throw new Error("Ej byggd: WP4");
}
