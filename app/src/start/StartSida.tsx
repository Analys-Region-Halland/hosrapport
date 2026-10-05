// start/StartSida.tsx: startsidan (stilguiden 4.1).
// Ägare: WP11. Stubb från WP0; props är preliminära tills WP11 bestämt dem.

import type { ReactNode } from "react";

export interface StartSidaProps {
  onValj?(kapitelId: string): void;
}

export default function StartSida(_props: StartSidaProps): ReactNode {
  throw new Error("Ej byggd: WP11");
}
