// begrepp/Prosa.tsx: löptext där begreppen länkas (lanka.ts).
// Ägare: WP5. Stubb från WP0; props är preliminära tills WP5 bestämt dem.

import type { ReactNode } from "react";

export interface ProsaProps {
  text: string;
  redan?: Set<string>;      // delas inom en indikator
}

export default function Prosa(_props: ProsaProps): ReactNode {
  throw new Error("Ej byggd: WP5");
}
