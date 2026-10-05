// nav/Lank.tsx: länk till en adress i rapporten.
// Ägare: WP6. Stubb från WP0; props är preliminära tills WP6 bestämt dem.

import type { ReactNode } from "react";
import type { Route } from "./route";

export interface LankProps {
  till: Route;
  children: ReactNode;
}

export default function Lank(_props: LankProps): ReactNode {
  throw new Error("Ej byggd: WP6");
}
