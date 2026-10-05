// sektioner/smaMultiplar.stilguide.tsx: små multiplar i den levande stilguiden
// (stilguiden 6.3, 6.5, 6.6, 6.7 och 6.8). Läses av verktyg/stilguide.tsx (WP7)
// via import.meta.glob; filen exporterar { id, rubrik, ordning, Sektion }.
// Ägare: WP3.
//
// Exemplen är riktig data (beläggningen per sjukhus ur akutflödesutdraget) och
// WP1:s påhittade hierarki (utskrivningarna per avdelning på sjukhuset i
// Varberg; galleriet visar återinskrivningarna i Halmstad, så att de två
// brödsmulorna får olika namn), byggda av kpiTillSpec (exempelSpec) och ritade i WP4:s Figur med
// nivåflikar och brödsmula. Nedborrning: Figur skickar onFokus vidare till
// diagrammet, så klick på ett panelnamn (eller Enter i panelen) byter fokus,
// som i rapporten.

import { useMemo, useState } from "react";
import type { VisningId } from "../../src/charts/spec";
import { smaMultiplarKolumner, tema } from "../../src/design/tema";
import Figur from "../../src/figur/Figur";
import { Blockrubrik, Dek, Not, Prosa, Tabell, Underrubrik } from "./delar";
import { exempel, exempelBrodsmula, exempelSpec, exempelVisningar, type ExempelNamn } from "./exempel";
import { svTal } from "./tokenhjalp";

export const id = "smaMultiplar";
export const rubrik = "Små multiplar";
export const ordning = 67;

function Exempel({ namn, rubrik, bild }: { namn: ExempelNamn; rubrik: string; bild: string }) {
  const start = exempel(namn);
  const [fokus, setFokus] = useState<string | undefined>(start.kontext?.fokus);
  const [visning, setVisning] = useState<VisningId>(start.visning);
  const [fasta, setFasta] = useState<string[]>([]);
  const resultat = useMemo(() => ({
    spec: exempelSpec(namn, { fokus, fasta }, visning),
    visningar: exempelVisningar(namn, { fokus }),
    brodsmula: exempelBrodsmula(namn, { fokus }),
  }), [namn, fokus, fasta, visning]);
  // Nedborrning: ny fokus, och små multiplar igen om den nya nivån har enheter
  const borra = (enhetId: string) => {
    const har = exempelVisningar(namn, { fokus: enhetId }).some((v) => v.id === "enheter");
    setFokus(enhetId);
    setVisning(har ? "enheter" : "tid");
    setFasta([]);
  };
  return (
    <div data-bank-bild={bild} data-smaexempel={bild}>
      <Blockrubrik>{rubrik}</Blockrubrik>
      <Prosa>{start.vad}</Prosa>
      <Figur
        spec={resultat.spec} rubrikniva={4}
        visningar={resultat.visningar.length > 1 ? resultat.visningar : undefined} visning={visning} onVisning={setVisning}
        brodsmula={resultat.brodsmula.length ? resultat.brodsmula : undefined} onFokus={borra}
        fasta={fasta} onFasta={setFasta}
      />
    </div>
  );
}

/** Delens namn i tabellen, på en rad (bryts inte mitt i ordet). */
const del = (text: string) => <span style={{ whiteSpace: "nowrap" }}>{text}</span>;

export function Sektion() {
  const d = tema.diagram;
  const s = d.smaMultiplar;
  const k = d.hojd.kompakt;
  return (
    <div>
      <Dek>
        Små multiplar visar samma mått för varje enhet i en egen panel med delad skala, bäst först. Hjälplinjen följer
        pekaren i alla paneler samtidigt, och panelens namn leder ned en nivå.
      </Dek>

      <Underrubrik>Exempel</Underrubrik>
      <Exempel namn="sma-multiplar" bild="sma-sjukhus" rubrik="Per sjukhus" />
      <Exempel namn="sma-multiplar-avdelning-varberg" bild="sma-avdelning" rubrik="Per avdelning, med nedborrning" />

      <Underrubrik>Uppbyggnad</Underrubrik>
      <Tabell
        caption="Små multiplars delar"
        kolumner={["Del", "Spec"]}
        rader={[
          [del("Kolumner"), `${smaMultiplarKolumner(s.tre)} när diagrammet är minst ${s.tre} px, ${smaMultiplarKolumner(s.tva)} vid ${s.tva}–${s.tre - 1}, 1 under ${s.tva}. Högst ${s.maxPaneler} paneler.`],
          [del("Panel"), `Höjd clamp(${k.min}, ${svTal(k.andel)} × panelbredd, ${k.max}) px plus rubriken. Rubrik: namnet i typ.roll.granssnitt 600, senaste värdet och enhetens statusmarkör; på två rader i alla paneler när det inte ryms på en.`],
          [del("Skala"), "Delad y-skala i alla paneler, tickvärden en gång till vänster. Mycket olika storlek: index med första perioden som 100, och det står i noten."],
          [del("Ordning"), "Bäst först enligt indikatorns riktning, efter värde för neutrala mått."],
          [del("Referens"), "Överordnad nivå streckad i varje panel för andels- och medelmått, med etikett bara i första panelen. Summamått har ingen referens."],
        ]}
      />

      <Underrubrik>Interaktion</Underrubrik>
      <Tabell
        caption="Små multiplars interaktion"
        kolumner={["Handling", "Mus", "Tangentbord", "Pekskärm"]}
        rader={[
          ["Visa en period", "Hovra i en panel: hjälplinjen i alla paneler, tooltipen i panelen under pekaren", "Tab, sedan ← → och Home/End", "Tryck"],
          ["Byta panel", "Flytta pekaren", "↑ ↓ i visningsordning", "Tryck i en annan panel"],
          ["Borra ned", "Klick på panelens namn", "Enter", "Tryck på panelens namn"],
          ["Stänga", "Pekaren lämnar panelerna", "Escape", "Tryck utanför"],
        ]}
      />
      <Not>
        Under {d.tooltip.helBreddUnder} px står tooltipen under panelen i full bredd i stället för ovanpå linjerna.
        Efter nedborrningen leder brödsmulan tillbaka (stilguiden 6.7).
      </Not>
    </div>
  );
}
