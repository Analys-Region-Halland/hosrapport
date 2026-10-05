// figur/Kallrad.tsx: källraden med åtgärderna högerställda (stilguiden 6.1).
// Ägare: WP4. Stubb från WP0; props är preliminära tills WP4 bestämt dem.

import type { ReactNode } from "react";

export interface KallradProps {
  kalla?: { namn: string; url?: string };
  children?: ReactNode;     // åtgärderna
}

export default function Kallrad(_props: KallradProps): ReactNode {
  throw new Error("Ej byggd: WP4");
}
