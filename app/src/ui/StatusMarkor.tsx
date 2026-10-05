// ui/StatusMarkor.tsx: statusmarkören, pill med "I fas", "Bevaka" eller "Avvikelse" (stilguiden 5.1).
// Ägare: WP4. Stubb från WP0; props är preliminära tills WP4 bestämt dem.

import type { ReactNode } from "react";
import type { Status } from "../data/modell";

export interface StatusMarkorProps {
  status: Status;
}

export default function StatusMarkor(_props: StatusMarkorProps): ReactNode {
  throw new Error("Ej byggd: WP4");
}
