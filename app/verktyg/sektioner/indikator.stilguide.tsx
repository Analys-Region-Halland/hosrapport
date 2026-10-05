// sektioner/indikator.stilguide.tsx: stilguidens sektion för rapportsidan
// (stilguiden 4.3 och 4.4): en hel indikator, nyckeltalsraden för ett
// beskrivande mått och ett kort kapitelutdrag (masthead, Det viktigaste och
// Läget i korthet). Byggs ur WP1:s fixtur skrUtdrag(), så att bänkens bilder
// står still när R kör om. Ägare: WP9. Globbas av stilguide.tsx (WP7).
//
// Länkarna navigerar inte i stilguiden (klicken fångas). Figuren monteras
// direkt (latFigur={false}), så att den finns när bänken fotograferar.

import { useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { skrUtdrag } from "../../src/data/fixturer";
import type { KpiModell } from "../../src/data/modell";
import DetViktigaste, { type ViktigPunkt } from "../../src/rapport/DetViktigaste";
import Indikator from "../../src/rapport/Indikator";
import LagetIKorthet from "../../src/rapport/LagetIKorthet";
import Masthead from "../../src/rapport/Masthead";
import Nyckeltal from "../../src/rapport/Nyckeltal";
import { byggDisposition } from "../../src/rapport/ramDisposition";
import { kapitelMetarad } from "../../src/rapport/rapportText";
import { Dek, Kod, Not, Prosa, Underrubrik } from "./delar";

export const id = "rapportsidan";
export const rubrik = "Kapitel och indikator";
export const ordning = 70;

const stil = {
  exempel: { marginTop: "var(--rum-5)", padding: "var(--rum-6) 0", background: "var(--farg-papper)" },
  kapitel: { maxWidth: "var(--matt-figur)", display: "grid", rowGap: "var(--rum-8)" },
} satisfies Record<string, CSSProperties>;

const VY = "ar" as const;
const PUBLICERAD = "2026-03-31";

function Exempel({ bild, children }: { bild: string; children: ReactNode }) {
  return <div style={stil.exempel} data-bank-bild={`rapportsidan-${bild}`}>{children}</div>;
}

export function Sektion() {
  const [kapitel] = useState(skrUtdrag);
  const d = byggDisposition(kapitel);
  const kpi = (id: string) => kapitel.kpier.find((k) => k.id === id) as KpiModell;
  const nummer = new Map(d.avsnitt.flatMap((a) => a.indikatorer).map((x) => [x.id, x]));
  const forsta = d.avsnitt[0]?.indikatorer[0];
  const beskrivande = kapitel.kpier.find((k) => k.status === null);
  const punkter: ViktigPunkt[] = kapitel.huvudpunkter.map((h) => {
    const x = h.kpi_id ? nummer.get(h.kpi_id) : undefined;
    return x ? { text: h.text, lank: { till: { sida: "kapitel", id: kapitel.id, vy: VY, i: x.id }, text: `se ${x.nummer}`, namn: x.namn } } : { text: h.text };
  });

  // Länkar navigerar inte i stilguiden.
  const fanga = (e: MouseEvent) => {
    if ((e.target as Element).closest("a[href^='#/']")) e.preventDefault();
  };

  return (
    <div onClickCapture={fanga} data-stilguide-rapportsidan="">
      <Dek>
        Kapitlet och indikatorn: svaret först, en uppgift på ett ställe och fördjupning på begäran. Exemplen är
        byggda ur ett utdrag ur SKR-kapitlen.
      </Dek>

      <Underrubrik>En hel indikator</Underrubrik>
      <Prosa>
        Rubrikrad med nummer, namn och status, nyckeltalsraden, analysen med proveniensrad, figuren och den stängda
        fördjupningen. Status, värde, plats och period står bara en gång, och figuren upprepar inte namnet.
      </Prosa>
      {forsta && (
        <Exempel bild="indikator">
          <Indikator kpi={kpi(forsta.id)} kapitel={kapitel} nummer={forsta.nummer} vy={VY} latFigur={false} />
        </Exempel>
      )}
      <Not>
        Ordningen är fast (<Kod>rapport/Indikator.tsx</Kod>). Analysen börjar inte med siffrorna i nyckeltalsraden;
        dagens inledande upprepning i texterna från R tas bort i <Kod>rapport/rapportText.ts</Kod> tills R skriver om dem.
      </Not>

      {beskrivande && (
        <>
          <Underrubrik>Beskrivande mått</Underrubrik>
          <Prosa>Ingen statusmarkör och ingen plats. Nyckeltalsraden säger "beskrivande mått" där platsen annars står.</Prosa>
          <Exempel bild="beskrivande">
            <Nyckeltal kpi={beskrivande} vy={VY} />
          </Exempel>
        </>
      )}

      <Underrubrik>Kapitelutdrag</Underrubrik>
      <Prosa>
        Mastheadet med logotyp, kicker, titel, linje, dek och metarad, sedan Det viktigaste och Läget i korthet.
        Kolumnhuvudena i tabellen sorterar; Indikator återställer avsnittens ordning.
      </Prosa>
      <Exempel bild="kapitel">
        <div style={stil.kapitel}>
          <Masthead
            logotyp
            kicker="Patienten och tillgängligheten"
            titel={kapitel.namn}
            dek="Ett utdrag med fyra indikatorer i två avsnitt: luckor och seriebrott, kronor och ett beskrivande mått."
            metarad={kapitelMetarad(kapitel, VY, PUBLICERAD)}
          />
          <DetViktigaste punkter={punkter} />
          <LagetIKorthet kapitel={kapitel} vy={VY} />
        </div>
      </Exempel>
    </div>
  );
}
