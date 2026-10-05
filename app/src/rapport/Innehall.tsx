// rapport/Innehall.tsx: innehållsförteckningen som spalt eller ark (stilguiden 4.5).
// Ägare: WP6. Stubb från WP0; props är preliminära tills WP6 bestämt dem.

import type { ReactNode } from "react";
import type { KapitelModell } from "../data/modell";

export interface InnehallProps {
  kapitel: KapitelModell;
  aktivt?: string;          // blockId
}

export default function Innehall(_props: InnehallProps): ReactNode {
  throw new Error("Ej byggd: WP6");
}
