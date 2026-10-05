// figur/Figur.tsx: figurramen runt varje diagram (stilguiden 6.1 och 6.8,
// docs/arkitektur.md 4.4). Ägare: WP4.
// Stubb från WP0: FigurProps är slutlig. Komponenten visar bara titel,
// undertitel och diagrammet, så att WP2 kan rendera Figur + spec i grafprov
// innan WP4 är klar.

import Diagram from "../charts/Diagram";
import type { ChartSpec, VisningId } from "../charts/spec";

export interface FigurProps {
  spec: ChartSpec;
  rubrikniva?: 3 | 4;                                  // 4 i indikatorn
  visningar?: { id: VisningId; etikett: string }[]; visning?: VisningId; onVisning?(v: VisningId): void;
  dagFlik?: { pa: boolean; onByt(pa: boolean): void };
  brodsmula?: { id: string; namn: string }[]; onFokus?(enhetId: string): void;
  fasta?: string[]; onFasta?(ids: string[]): void;
  atgarder?: ("tabell" | "ladda" | "forstora")[];      // förval alla tre
}

export default function Figur({ spec, rubrikniva = 3, fasta, onFasta }: FigurProps) {
  const Rubrik = rubrikniva === 4 ? "h4" : "h3";
  return (
    <figure data-figur={spec.id}>
      <figcaption>
        <Rubrik>{spec.titel}</Rubrik>
        <p>{spec.undertitel}</p>
      </figcaption>
      <Diagram spec={spec} fasta={fasta} onFasta={onFasta} />
    </figure>
  );
}
