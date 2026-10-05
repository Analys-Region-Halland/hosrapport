// grafprov-figur.tsx: enkel figurplatta runt Diagram för grafprovet och
// linjediagrammets stilguidesektion: titel, undertitel, plotyta, noter och
// källa (stilguiden 6.1). Ersätts av WP4:s Figur när den är sammanslagen.
// Ägare: WP2.

import Diagram from "../src/charts/Diagram";
import type { ChartSpec } from "../src/charts/spec";
import s from "./grafprov.module.css";

interface Props {
  spec: ChartSpec;
  fasta?: string[];
  onFasta?(ids: string[]): void;
  bredd?: number;          // figurens bredd i px (annars upp till matt.figur)
  etikett?: string;        // "Exempel · …" ovanför figuren
}

export function ProvFigur({ spec, fasta, onFasta, bredd, etikett }: Props) {
  const noter = spec.noter.map((n) => n.text);
  return (
    <div className={s.exempel}>
      {etikett && <p className={s.etikett}>{etikett}</p>}
      <figure className={s.figur} style={bredd ? { width: bredd, maxWidth: "none" } : undefined} data-figur={spec.id}>
        <figcaption>
          <h4 className={s.titel}>{spec.titel}</h4>
          <p className={s.undertitel}>{spec.undertitel}</p>
        </figcaption>
        <div className={s.plot}>
          <Diagram spec={spec} fasta={fasta} onFasta={onFasta} />
        </div>
        {fasta && fasta.length > 0 && (
          <p className={s.fasta}>
            Fästa: {fasta.map((id) => spec.serier.find((x) => (x.enhetId ?? x.id) === id)?.namn ?? id).join(", ")}
          </p>
        )}
        <div className={s.fot}>
          {noter.length > 0 && <p>Not: {noter.join(" ")}</p>}
          {spec.kalla && <p>Källa: {spec.kalla.namn}</p>}
        </div>
      </figure>
    </div>
  );
}
