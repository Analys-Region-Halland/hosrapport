// sektioner/linje.stilguide.tsx: linjediagrammet i den levande stilguiden
// (WP7 globbar sektioner/*.stilguide.tsx; varje fil exporterar id, rubrik,
// ordning och Sektion). Exemplen är riktig data med full interaktion:
// spaghettigraf med alla 21 regioner och riket för kolada-n79179 (luckor och
// seriebrott) och för en indikator utan luckor, samma graf med två fästa
// regioner, och förväntat intervall (akutflöde, månad). Ägare: WP2.

import { useState } from "react";
import type { VyId } from "../../src/data/modell";
import { ProvFigur } from "../grafprov-figur";
import { useSpec } from "../grafprov-data";
import s from "../grafprov.module.css";

export const id = "linje";
export const rubrik = "Linjediagram";
export const ordning = 60;

interface ExempelProps {
  etikett: string;
  vy: VyId;
  sektion: string;
  kpi: string;
  fasta?: string[];
}

function Exempel({ etikett, vy, sektion, kpi, fasta: start = [] }: ExempelProps) {
  const { spec, fel } = useSpec(vy, sektion, kpi);
  const [fasta, setFasta] = useState<string[]>(start);
  if (fel) return <p className={s.etikett}>{fel}</p>;
  if (!spec) return <p className={s.etikett}>Laddar {kpi} …</p>;
  return <ProvFigur spec={spec} fasta={fasta} onFasta={setFasta} etikett={etikett} />;
}

export function Sektion() {
  return (
    <div data-sektion="linje">
      <Exempel
        etikett="Alla 21 regioner och riket, med luckor och seriebrott (kolada-n79179)"
        vy="ar" sektion="skr-tillganglighet" kpi="kolada-n79179"
      />
      <Exempel
        etikett="Alla 21 regioner och riket, utan luckor (kolada-u79049)"
        vy="ar" sektion="skr-tillganglighet" kpi="kolada-u79049"
      />
      <Exempel
        etikett="Samma graf med två fästa regioner: Skåne och Stockholm (kolada-n79179)"
        vy="ar" sektion="skr-tillganglighet" kpi="kolada-n79179" fasta={["0012", "0001"]}
      />
      <Exempel
        etikett="Mot förväntat intervall, per månad (akutflöde, beläggningsgrad)"
        vy="manad" sektion="akutflode" kpi="belaggning"
      />
    </div>
  );
}
