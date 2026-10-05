// ui/Dialog.tsx: modal dialog med fokusfälla; Escape via nav/lager.ts (stilguiden 6.8).
// Ägare: WP4. Stubb från WP0; props är preliminära tills WP4 bestämt dem.

import type { ReactNode } from "react";

export interface DialogProps {
  oppen: boolean;
  onStang(): void;
  etikett: string;
  children: ReactNode;
}

export default function Dialog(_props: DialogProps): ReactNode {
  throw new Error("Ej byggd: WP4");
}
