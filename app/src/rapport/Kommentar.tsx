// rapport/Kommentar.tsx: verksamhetens kommentar (stilguiden 4.4).
// Ägare: WP9. Stubb från WP0; props är preliminära tills WP9 bestämt dem.

import type { ReactNode } from "react";

export interface KommentarProps {
  blockId: string;
  redigera: boolean;
}

export default function Kommentar(_props: KommentarProps): ReactNode {
  throw new Error("Ej byggd: WP9");
}
