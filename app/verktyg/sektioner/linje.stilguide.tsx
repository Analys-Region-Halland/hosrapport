// sektioner/linje.stilguide.tsx: linjediagrammet i den levande stilguiden
// (stilguiden 6.3, 6.4 och 6.8). Läses av verktyg/stilguide.tsx (WP7) via
// import.meta.glob; filen exporterar { id, rubrik, ordning, Sektion }. Ägare: WP2.
//
// Exemplen är riktig data med full interaktion, byggda av WP1:s kpiTillSpec på
// WP1:s fixturer (exempelSpec) och ritade i WP4:s Figur: spaghettigraf med alla
// 21 regioner och riket för kolada-n79179 (luckor och seriebrott) och för en
// indikator utan luckor, samma graf med två fästa regioner, och förväntat
// intervall (akutflöde, månad). Fästa serier är sektionens tillstånd och
// ingår i specens kontext, som i rapporten.

import { useMemo, useState } from "react";
import { tema } from "../../src/design/tema";
import Figur from "../../src/figur/Figur";
import { Blockrubrik, Dek, Not, Prosa, Tabell, Underrubrik } from "./delar";
import { exempel, exempelSpec, type ExempelNamn } from "./exempel";

export const id = "linje";
export const rubrik = "Linjediagram";
export const ordning = 64;

function Exempel({ namn, rubrik, fasta: start = [], bild }: { namn: ExempelNamn; rubrik: string; fasta?: string[]; bild: string }) {
  const [fasta, setFasta] = useState<string[]>(start);
  const spec = useMemo(() => exempelSpec(namn, { fasta }), [namn, fasta]);
  return (
    <div data-bank-bild={bild} data-linjeexempel={namn}>
      <Blockrubrik>{rubrik}</Blockrubrik>
      <Prosa>{exempel(namn).vad}</Prosa>
      <Figur spec={spec} rubrikniva={4} fasta={fasta} onFasta={setFasta} />
    </div>
  );
}

export function Sektion() {
  const t = tema.diagram;
  return (
    <div>
      <Dek>
        Linjediagrammet visar utveckling över tid med Halland i grönt, riket streckat och övriga regioner som hårfina
        grå linjer. Namnen står där linjerna slutar; hovring, tangentbord och tryck ger detaljer utan att något hoppar.
      </Dek>

      <Underrubrik>Exempel</Underrubrik>
      <Exempel namn="spaghetti-luckor" bild="linje-luckor" rubrik="Alla 21 regioner och riket, med luckor och seriebrott" />
      <Exempel namn="spaghetti-hel" bild="linje-hel" rubrik="Alla 21 regioner och riket, utan luckor" />
      <Exempel namn="spaghetti-luckor" bild="linje-fasta" fasta={["0012", "0001"]} rubrik="Samma graf med två fästa regioner" />
      <Exempel namn="forvantat" bild="linje-forvantat" rubrik="Mot förväntat intervall, per månad" />

      <Underrubrik>Interaktion</Underrubrik>
      <Tabell
        caption="Linjediagrammets interaktion"
        kolumner={["Handling", "Mus", "Tangentbord", "Pekskärm"]}
        rader={[
          ["Visa värden för en period", "Hovra över plotytan", "Tab, sedan ← → och Home/End", "Tryck"],
          ["Lyfta en linje", `Pekaren inom ${t.traffyta.lyft} px från linjen`, "↑ ↓ (Halland, riket, fästa, övriga efter värde)", "Tryck på linjen"],
          ["Hålla kvar", `Släpps efter ${t.traffyta.slapp} px eller när en annan linje är ${t.traffyta.byte} px närmare`, "–", "–"],
          ["Fästa eller ta bort", "Klick på linjen eller etiketten", "Enter", "Tryck igen på samma linje"],
          ["Stänga", "Pekaren lämnar plotytan", "Escape", "Tryck utanför"],
        ]}
      />
      <Not>
        Avståndet mäts vinkelrätt mot linjesegmentet, inte lodrätt. Halland, riket och fästa serier får 2 px företräde.
        Högst {t.maxFasta} fästa serier; den femte ersätter den äldsta.
      </Not>
    </div>
  );
}
