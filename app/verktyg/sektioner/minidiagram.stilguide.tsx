// sektioner/minidiagram.stilguide.tsx: minidiagrammet i den levande stilguiden
// (stilguiden 5.8, 6.5 och 6.6). Läses av verktyg/stilguide.tsx (WP7) via
// import.meta.glob; filen exporterar { id, rubrik, ordning, Sektion }. Ägare: WP3.
//
// Exemplet är de första raderna i översiktstabellen för rapportkapitlet
// (oversiktExempel, WP7), med minidiagrammet från WP1:s minidiagramSpec ritat
// direkt av renderaren i sina fasta mått, som i Läget i korthet.

import { useMemo } from "react";
import { RENDERARE } from "../../src/charts/register";
import type { ChartSpec } from "../../src/charts/spec";
import { tema } from "../../src/design/tema";
import { Dek, Not, Tabell, Underrubrik } from "./delar";
import { oversiktExempel } from "./exempel";
import { svTal } from "./tokenhjalp";

export const id = "minidiagram";
export const rubrik = "Minidiagram";
export const ordning = 68;

/** Ett minidiagram i en tabellcell, i minidiagrammets fasta mått (stilguiden 6.5). */
function Mini({ spec }: { spec: ChartSpec }) {
  const r = RENDERARE.minidiagram;
  const { bredd, hojd } = tema.diagram.hojd.minidiagram;
  const scen = useMemo(() => r.layout(spec, { bredd, hojd }, tema), [r, spec, bredd, hojd]);
  const Rita = r.Rita;
  return <Rita scen={scen} spec={spec} aktiv={null} fasta={[]} />;
}

/** Delens namn i tabellen, på en rad (bryts inte mitt i ordet). */
const del = (text: string) => <span style={{ whiteSpace: "nowrap" }}>{text}</span>;

export function Sektion() {
  const oversikt = useMemo(() => oversiktExempel(), []);
  const rader = oversikt.avsnitt.flatMap((a) => a.rader).slice(0, 6);
  const m = tema.diagram.minidiagram;
  const h = tema.diagram.hojd.minidiagram;
  return (
    <div>
      <Dek>
        Minidiagrammet visar utvecklingen i en tabellrad: bara Hallands linje och senaste punkten, utan axlar och med egen
        skala per rad. Det står aldrig fristående.
      </Dek>

      <Underrubrik>Exempel</Underrubrik>
      <div data-bank-bild="minidiagram-tabell">
        <Tabell
          caption={`Utveckling per indikator, ${oversikt.kapitel}`}
          kolumner={["Indikator", "Senaste", "Utveckling"]}
          tal={[1]}
          rader={rader.map((r) => [r.namn, r.senaste, <Mini key={r.kpiId} spec={r.spec} />])}
        />
      </div>

      <Underrubrik>Uppbyggnad</Underrubrik>
      <Tabell
        caption="Minidiagrammets mått"
        kolumner={["Del", "Spec"]}
        rader={[
          [del("Storlek"), `${h.bredd} × ${h.hojd} px`],
          [del("Linje"), `${svTal(m.bredd)} px i farg.diagram.fokus, raka linjer, luckor bryter linjen`],
          [del("Slutpunkt"), `r ${svTal(m.punktradie)} vid senaste värdet; ett ensamt värde mellan luckor blir en liten punkt`],
          [del("Skala"), "Egen per rad, från radens lägsta till högsta värde. Perioder som ingen mätte (enkäter vartannat år) tas bort."],
        ]}
      />
      <Not>
        Minidiagrammet har ingen egen interaktion; raden i tabellen är länk till indikatorn. Diagrammet har role=&quot;img&quot; och
        textsammanfattningen som namn.
      </Not>
    </div>
  );
}
