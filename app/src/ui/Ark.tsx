// ui/Ark.tsx: ark från skärmens nederkant under 640 px (stilguiden 5.7).
// Ägare: WP5. Stubb från WP0; props är preliminära tills WP5 bestämt dem.

import type { ReactNode } from "react";

export interface ArkProps {
  oppen: boolean;
  onStang(): void;
  etikett: string;
  children: ReactNode;
}

export default function Ark(_props: ArkProps): ReactNode {
  throw new Error("Ej byggd: WP5");
}
