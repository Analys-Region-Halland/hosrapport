// sektioner/stapel.stilguide.tsx: stapel över tid i den levande stilguiden
// (stilguiden 6.3, 6.6 och 6.8). Läses av verktyg/stilguide.tsx (WP7) via
// import.meta.glob; filen exporterar { id, rubrik, ordning, Sektion }. Ägare: WP3.
//
// Exemplet är riktig data med full interaktion: besök på akutmottagningen per
// månad ur WP1:s akutflödesutdrag (24 månader, summamått utan regioner), byggt
// av kpiTillSpec (exempelSpec) och ritat i WP4:s Figur.

import { useMemo } from "react";
import { tema } from "../../src/design/tema";
import Figur from "../../src/figur/Figur";
import { Blockrubrik, Dek, Not, Prosa, Tabell, Underrubrik } from "./delar";
import { exempel, exempelSpec } from "./exempel";
import { svTal } from "./tokenhjalp";

export const id = "stapel";
export const rubrik = "Stapel över tid";
export const ordning = 66;

/** Delens namn i tabellen, på en rad (bryts inte mitt i ordet). */
const del = (text: string) => <span style={{ whiteSpace: "nowrap" }}>{text}</span>;

export function Sektion() {
  const spec = useMemo(() => exempelSpec("stapel"), []);
  const d = tema.diagram;
  return (
    <div>
      <Dek>
        Staplar visar volymer per period när det inte finns regioner att jämföra med. De står alltid på noll, och hovring
        visar förändringen mot föregående period och mot samma period året innan.
      </Dek>

      <Underrubrik>Exempel</Underrubrik>
      <div data-bank-bild="stapel-manad">
        <Blockrubrik>Besök per månad</Blockrubrik>
        <Prosa>{exempel("stapel").vad}</Prosa>
        <Figur spec={spec} rubrikniva={4} />
      </div>

      <Underrubrik>Uppbyggnad</Underrubrik>
      <Tabell
        caption="Stapeldiagrammets delar"
        kolumner={["Del", "Spec"]}
        rader={[
          [del("Staplar"), `farg.diagram.fokus, stapelbredd = ${svTal(d.stapel.breddPerMellanrum)} × mellanrum. Högst 24 staplar, annars linje. Saknad period: ingen stapel.`],
          [del("Nollbaslinje"), `${svTal(d.nollinje)} px i farg.diagram.nollinje, ovanpå staplarnas underkant. Värdeaxeln börjar alltid på noll.`],
          [del("Rutnät och axlar"), `Vågrätt, ${svTal(d.rutnat.bredd)} px streckat ${d.rutnat.streck}. Tickvärden och tidsaxel som i linjediagrammet.`],
          [del("Hovring"), `Stapeln mörkas med farg.black i opacitet ${svTal(d.stapel.morkning)}; hjälplinjen går från plotytans överkant ned till stapeln.`],
        ]}
      />

      <Underrubrik>Interaktion</Underrubrik>
      <Tabell
        caption="Stapeldiagrammets interaktion"
        kolumner={["Handling", "Mus", "Tangentbord", "Pekskärm"]}
        rader={[
          ["Visa en period", "Hovra över plotytan", "Tab, sedan ← → och Home/End", "Tryck"],
          ["Stänga", "Pekaren lämnar plotytan", "Escape", "Tryck utanför"],
        ]}
      />
      <Not>
        Tooltipen visar perioden, värdet och förändringen med tecken och i procent. För årsdata är föregående period och samma
        period året innan samma sak och visas en gång. Staplar kan inte fästas.
      </Not>
    </div>
  );
}
