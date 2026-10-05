// ui/Popover.tsx: popover för begrepp och jämför-listan (stilguiden 5.7).
// Ägare: WP5. Stubb från WP0; props är preliminära tills WP5 bestämt dem.

import type { ReactNode } from "react";

export interface PopoverProps {
  oppen: boolean;
  onStang(): void;
  ankare: HTMLElement | null;
  children: ReactNode;
}

export default function Popover(_props: PopoverProps): ReactNode {
  throw new Error("Ej byggd: WP5");
}
