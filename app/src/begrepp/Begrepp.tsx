// begrepp/Begrepp.tsx: en begreppsmarkering i text som öppnar popover eller ark (stilguiden 5.7).
// Ägare: WP5. Stubb från WP0; props är preliminära tills WP5 bestämt dem.

import type { ReactNode } from "react";

export interface BegreppProps {
  id: string;
  children: ReactNode;
}

export default function Begrepp(_props: BegreppProps): ReactNode {
  throw new Error("Ej byggd: WP5");
}
