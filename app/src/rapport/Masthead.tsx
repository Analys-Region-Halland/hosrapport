// rapport/Masthead.tsx: kapitlets eller sammanfattningens masthead (stilguiden 4.2 och 4.3).
// Ägare: WP9. Stubb från WP0; props är preliminära tills WP9 bestämt dem.

import type { ReactNode } from "react";

export interface MastheadProps {
  kicker?: string;
  titel: string;
  dek?: string;
  metarad: string;
  children?: ReactNode;     // tidsupplösningsväljaren
}

export default function Masthead(_props: MastheadProps): ReactNode {
  throw new Error("Ej byggd: WP9");
}
