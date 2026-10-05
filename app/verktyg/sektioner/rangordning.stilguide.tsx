// sektioner/rangordning.stilguide.tsx: rangordningen i den levande stilguiden
// (stilguiden 6.5, 6.6 och 6.8). Läses av verktyg/stilguide.tsx (WP7) via
// import.meta.glob; filen exporterar { id, rubrik, ordning, Sektion }. Ägare: WP3.
//
// Exemplen är riktig data med full interaktion, byggda av WP1:s kpiTillSpec på
// WP1:s fixturer (exempelSpec) och ritade i WP4:s Figur: telefontillgängligheten
// 2025 med två fästa regioner, ett mått där Halland delar avrundat värde med en
// annan region, och sjukhusen rangordnade med Region Halland som referens.
// Fästa serier är sektionens tillstånd, som i rapporten.

import { useMemo, useState } from "react";
import type { VisningId } from "../../src/charts/spec";
import { tema } from "../../src/design/tema";
import Figur from "../../src/figur/Figur";
import { Blockrubrik, Dek, Not, Prosa, Tabell, Underrubrik } from "./delar";
import { exempel, exempelSpec, type ExempelNamn } from "./exempel";
import { svTal } from "./tokenhjalp";

export const id = "rangordning";
export const rubrik = "Rangordning";
export const ordning = 65;

function Exempel({ namn, rubrik, text, visning, fasta: start = [], bild }: {
  namn: ExempelNamn; rubrik: string; text?: string; visning?: VisningId; fasta?: string[]; bild: string;
}) {
  const [fasta, setFasta] = useState<string[]>(start);
  const spec = useMemo(() => exempelSpec(namn, { fasta }, visning), [namn, fasta, visning]);
  return (
    <div data-bank-bild={bild} data-rangexempel={bild}>
      <Blockrubrik>{rubrik}</Blockrubrik>
      <Prosa>{text ?? exempel(namn).vad}</Prosa>
      <Figur spec={spec} rubrikniva={4} fasta={fasta} onFasta={setFasta} />
    </div>
  );
}

/** Delens namn i tabellen, på en rad (bryts inte mitt i ordet). */
const del = (text: string) => <span style={{ whiteSpace: "nowrap" }}>{text}</span>;

export function Sektion() {
  const d = tema.diagram;
  const r = d.rangordning;
  return (
    <div>
      <Dek>
        Rangordningen visar läget den senaste perioden: en rad per region, bäst överst, med Halland i grönt och riket som
        en streckad linje. Hovra eller pila mellan raderna för värde, plats och skillnad mot riket.
      </Dek>

      <Underrubrik>Exempel</Underrubrik>
      <Exempel namn="rangordning" bild="rangordning-regioner" fasta={["0012", "0024"]} rubrik="Regionerna, två fästa" />
      <Exempel namn="rangordning-lika" bild="rangordning-lika" rubrik="Lika värden" />
      <Exempel
        namn="sma-multiplar" visning="enheterRang" bild="rangordning-sjukhus" rubrik="Sjukhusen rangordnade"
        text="Beläggningsgraden för de tre sjukhusen, där lägre är bättre, med Region Halland som referens. Enheter får ingen topp 3-linje."
      />

      <Underrubrik>Uppbyggnad</Underrubrik>
      <Tabell
        caption="Rangordningens delar"
        kolumner={["Del", "Spec"]}
        rader={[
          [del("Rad"), `${d.hojd.rangordning.rad} px per rad, ${d.hojd.rangordning.radMobil} px under ${d.etikett.kortaUnder} px. Namnet högerställt i typ.roll.not, högst ${svTal(r.namnMaxAndel * 100)} % av bredden, längre namn kortas med ellips.`],
          [del("Punkt"), `Övriga r ${svTal(r.punktradie)} i farg.diagram.kontextPunkt. Halland r ${svTal(r.fokusPunktradie)} i farg.diagram.fokus med namn och värde i 600. Fästa regioner r ${svTal(r.punktradie)} i sin markeringsfärg med värde.`],
          [del("Riket"), `Lodrät linje ${svTal(d.roll.referens.bredd)} px, streck ${d.roll.referens.streck}, etikett och värde ovanför plotytan.`],
          [del("Topp 3"), `Heldragen linje ${svTal(d.roll.grans.bredd)} px i farg.diagram.grans under tredje platsen, "topp 3" i ${tema.typ.minsta} px vid högerkanten. Inte för neutrala mått.`],
          [del("Rutnät"), `Lodrätt, ${svTal(d.rutnat.bredd)} px streckat ${d.rutnat.streck}, på värdeaxelns jämna värden. Tickvärden under plotytan, ingen axellinje.`],
        ]}
      />

      <Underrubrik>Interaktion</Underrubrik>
      <Tabell
        caption="Rangordningens interaktion"
        kolumner={["Handling", "Mus", "Tangentbord", "Pekskärm"]}
        rader={[
          ["Visa en rad", "Hovra var som helst på raden, även på namnet", "Tab, sedan ↑ ↓ och Home/End", "Tryck på raden"],
          ["Fästa eller ta bort", "Klick på raden", "Enter", "Tryck igen på samma rad"],
          ["Stänga", "Pekaren lämnar raderna", "Escape", "Tryck utanför"],
        ]}
      />
      <Not>
        Raden under pekaren får en vågrät hjälplinje och namn och värde i 600. Tooltipen står vid raden, på andra sidan av
        plotytans mitt än punkten, så att grannarna med liknande värde syns. Fästa regioner delas med linjevyn.
      </Not>
    </div>
  );
}
