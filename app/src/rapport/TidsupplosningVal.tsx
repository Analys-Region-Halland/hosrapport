// rapport/TidsupplosningVal.tsx: väljaren för tidsupplösning i mastheadets metarad (stilguiden 4.3 och 5.4).
// Ägare: WP6. Stubb från WP0; props är preliminära tills WP6 bestämt dem.

import type { ReactNode } from "react";
import type { VyId } from "../data/modell";

export interface TidsupplosningValProps {
  vyer: VyId[];
  aktiv: VyId;
  onByt(vy: VyId): void;
}

export default function TidsupplosningVal(_props: TidsupplosningValProps): ReactNode {
  throw new Error("Ej byggd: WP6");
}
