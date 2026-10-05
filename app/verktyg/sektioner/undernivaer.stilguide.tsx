// sektioner/undernivaer.stilguide.tsx: undernivåer och nedborrning i den
// levande stilguiden (stilguiden 6.7 och 6.8). Läses av verktyg/stilguide.tsx
// (WP7) via import.meta.glob; filen exporterar { id, rubrik, ordning, Sektion }.
// Ägare: WP10.
//
// Exemplen är akutflödets kapitel per månad (public/data, laddat med
// data/laddning.ts) med den påhittade nivån under sjukhusen
// (data/exempelhierarki.ts), ritade med rapportens egen indikatorfigur
// (rapport/Indikator.tsx, IndikatorFigur): samma nivåflikar, brödsmula,
// nedborrning och undertryckning som i rapporten. Utan rapportens ram skrivs
// inget i adressen.

import { useEffect, useState, type ReactNode } from "react";
import { kpiTillSpec } from "../../src/charts/kpiTillSpec";
import { UNDERTRYCK_UNDER } from "../../src/data/exempelhierarki";
import { laddaKapitel } from "../../src/data/laddning";
import { HALLAND_ID, type KapitelModell, type KpiModell } from "../../src/data/modell";
import TabellVy from "../../src/figur/TabellVy";
import { IndikatorFigur } from "../../src/rapport/Indikator";
import type { NivaLage } from "../../src/rapport/nedborrning";
import { Blockrubrik, Dek, Kod, Not, Notis, Prosa, Tabell, Underrubrik } from "./delar";

export const id = "undernivaer";
export const rubrik = "Undernivåer och nedborrning";
export const ordning = 69;

const VY = "manad" as const;

/** Delens namn i tabellen, på en rad (bryts inte mitt i ordet). */
const del = (text: string) => <span style={{ whiteSpace: "nowrap" }}>{text}</span>;

function Exempel({ bild, rubrik, text, children }: { bild: string; rubrik: string; text: string; children: ReactNode }) {
  return (
    <div data-bank-bild={`undernivaer-${bild}`} data-undernivaexempel={bild}>
      <Blockrubrik>{rubrik}</Blockrubrik>
      <Prosa>{text}</Prosa>
      {children}
    </div>
  );
}

function Figur({ kap, kpi, start }: { kap: KapitelModell; kpi: KpiModell; start: NivaLage }) {
  return <IndikatorFigur kpi={kpi} kapitel={kap} vy={VY} start={start} />;
}

/** Akutflödet per månad, med den påhittade nivån under sjukhusen. */
function useAkutflode(): { kap: KapitelModell | null; fel: string | null } {
  const [lage, setLage] = useState<{ kap: KapitelModell | null; fel: string | null }>({ kap: null, fel: null });
  useEffect(() => {
    let levande = true;
    laddaKapitel(VY, "akutflode").then(
      (kap) => { if (levande) setLage({ kap, fel: null }); },
      (e: unknown) => { if (levande) setLage({ kap: null, fel: e instanceof Error ? e.message : String(e) }); },
    );
    return () => { levande = false; };
  }, []);
  return lage;
}

export function Sektion() {
  const { kap, fel } = useAkutflode();
  const kpi = (id: string) => kap?.kpier.find((k) => k.id === id);
  const vantetid = kpi("vantetid");
  const belaggning = kpi("belaggning");
  const tabell = kap && vantetid ? kpiTillSpec(vantetid, kap, { vy: VY, fokus: "halmstad" }, "enheter") : null;

  return (
    <div data-stilguide-undernivaer="">
      <Dek>
        Från Region Halland till sjukhus och avdelning i samma figur. Panelens namn eller en rad i enheternas rangordning
        leder ned en nivå, och brödsmulan ovanför plotytan leder tillbaka.
      </Dek>

      {fel && <Notis rubrik="Akutflödet kunde inte laddas"><p>{fel}</p></Notis>}
      {!kap && !fel && <Prosa>Laddar akutflödet …</Prosa>}

      {kap && vantetid && belaggning && (
        <>
          <Underrubrik>Exempel</Underrubrik>
          <Exempel
            bild="nedborrning"
            rubrik="Region Halland › Halmstad › avdelning"
            text="Medianväntetiden per sjukhus. Klicka på Halmstad (eller tabba till grafen, välj panel med ↑ ↓ och tryck Enter) för avdelningarna; brödsmulan går tillbaka."
          >
            <Figur kap={kap} kpi={vantetid} start={{ fokus: HALLAND_ID, visning: "enheter" }} />
          </Exempel>

          <Exempel
            bild="undertryckt"
            rubrik="Undertryckta värden"
            text={`Avdelningarna på sjukhuset i Halmstad. Infektion har ibland färre än ${UNDERTRYCK_UNDER} fall: värdet visas inte, linjen får en lucka och tabellen visar två punkter. Sjukhuset är referens i varje panel.`}
          >
            <Figur kap={kap} kpi={vantetid} start={{ fokus: "halmstad", visning: "enheter" }} />
          </Exempel>
          {tabell && (
            <div data-bank-bild="undernivaer-tabell">
              <TabellVy tabell={{ ...tabell.tabell, rader: tabell.tabell.rader.slice(-6) }} format={tabell.y.format} captionSynlig />
              <Not>De sex senaste månaderna ur tabellvyn ovan. Två punkter betyder undertryckt, tankstreck saknat värde.</Not>
            </div>
          )}

          <Exempel
            bild="rangordning"
            rubrik="Enheterna rangordnade"
            text="Sjukhusen rangordnade efter beläggningsgrad den senaste månaden. Klick på en rad (eller Enter på raden) visar sjukhuset, här med avdelningarna rangordnade."
          >
            <Figur kap={kap} kpi={belaggning} start={{ fokus: HALLAND_ID, visning: "enheterRang" }} />
          </Exempel>

          <Exempel
            bild="avdelning"
            rubrik="En avdelning, jämförd med sina syskon"
            text="Längst ned finns bara Över tid. Sjukhuset är referens, och knappen jämför med de andra avdelningarna på samma sjukhus."
          >
            <Figur kap={kap} kpi={belaggning} start={{ fokus: "halmstad-medicin-3", visning: "tid" }} />
          </Exempel>
        </>
      )}

      <Underrubrik>Regler</Underrubrik>
      <Tabell
        caption="Undernivåer och aggregat"
        kolumner={["Del", "Spec"]}
        rader={[
          [del("Nivåflik"), "Region Halland (förval) och Per {nivå}, till exempel Per sjukhus. Med fokus på ett sjukhus: Halmstad och Per avdelning. Etiketten kommer från datans nivå. Enheternas rangordning är en egen flik (Sjukhusen rangordnade) när det finns minst tre enheter."],
          [del("Nedborrning"), "Klick på panelens namn eller på en rad i enheternas rangordning gör enheten till fokus. Samma slags visning följer med ned en nivå; längst ned finns bara Över tid."],
          [del("Brödsmula"), "Ovanför plotytan när fokus ligger under regionen: Region Halland › Halmstad › Medicin 3, i typ.roll.not. Alla led utom det sista är länkar."],
          [del("Aggregatet"), "Aldrig en panel bland enheterna. Referenslinje för andels- och medelmått, nämnt i undertiteln för summamått."],
          [del("Få fall"), `Värden baserade på färre än ${UNDERTRYCK_UNDER} fall skickas inte: lucka i grafen, två punkter i tabellen och noten "Värden baserade på färre än ${UNDERTRYCK_UNDER} fall visas inte."`],
          [del("Jämför"), "+ Jämför med sjukhus eller + Jämför med avdelning listar syskonen på samma nivå under samma förälder."],
          [del("Adress"), "Visningen och fokusenheten står i adressen som v= och e= bredvid i=, till exempel i=vantetid&v=enheter&e=halmstad. De skrivs utan ny historikpost när läsaren byter flik eller nivå, och Kopiera länk tar med dem."],
        ]}
      />

      <Underrubrik>Interaktion</Underrubrik>
      <Tabell
        caption="Nedborrningens interaktion"
        kolumner={["Handling", "Mus", "Tangentbord", "Pekskärm"]}
        rader={[
          ["Borra ned", "Klick på panelens namn eller på raden", "Tab till grafen, ↑ ↓ till panelen eller raden, Enter", "Tryck på panelens namn; på raden: tryck, tryck igen"],
          ["Gå upp", "Klick på ett led i brödsmulan", "Tab till ledet, Enter", "Tryck på ledet"],
          ["Byta nivå eller visning", "Flik", "Flik (pilar, Enter)", "Flik"],
        ]}
      />
      <Not>
        Efter Enter i grafen står fokus kvar där och nästa nivås första panel läses upp. Efter brödsmulan flyttas fokus
        till den valda fliken. Avdelningarna och stationerna är påhittade (<Kod>data/exempelhierarki.ts</Kod>) tills riktig
        data per avdelning finns; kapitlets notis om exempeldata gäller dem.
      </Not>
    </div>
  );
}
