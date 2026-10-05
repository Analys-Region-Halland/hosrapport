// charts/Diagram.tsx: mäter bredden, anropar renderarens layout och ritar
// (docs/arkitektur.md 4.3). Äger interaktionslagret. Ägare: WP2.
// Stubb från WP0: ritar med RENDERARE i fast bredd utan mätning eller
// interaktion, så att Figur (WP4) och grafprov (WP2) kan rendera från början.

import { tema } from "../design/tema";
import { RENDERARE } from "./register";
import type { ChartSpec } from "./spec";

export interface DiagramProps {
  spec: ChartSpec;
  fasta?: string[];
  onFasta?(ids: string[]): void;
}

const STUBBREDD = 640;

export default function Diagram({ spec, fasta = [] }: DiagramProps) {
  const r = RENDERARE[spec.typ];
  const hojd = r.hojd(STUBBREDD, spec);
  const scen = r.layout(spec, { bredd: STUBBREDD, hojd }, tema);
  const Rita = r.Rita;
  return <Rita scen={scen} spec={spec} aktiv={null} fasta={fasta} />;
}
