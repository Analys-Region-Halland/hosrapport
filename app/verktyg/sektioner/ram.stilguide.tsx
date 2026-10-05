// sektioner/ram.stilguide.tsx: stilguidens sektion för rapportens ram
// (stilguiden 4.5 och 5.4): verktygsraden på desktop och i 360 px,
// positionsradens tre lägen, innehållsförteckningen som spalt och ark, och
// tidsupplösningens flikar. Byggs ur WP1:s fixtur skrUtdrag(). Ägare: WP6.
// Globbas av stilguide.tsx (WP7), som läser { id, rubrik, ordning, Sektion }.
//
// Länkarna i exemplen navigerar inte (klicken fångas), så stilguidens egen
// adress lämnas ifred. Ett klick i innehållsförteckningen gör posten aktiv.

import { useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { skrUtdrag } from "../../src/data/fixturer";
import type { VyId } from "../../src/data/modell";
import Innehall from "../../src/rapport/Innehall";
import Positionsrad from "../../src/rapport/Positionsrad";
import { byggDisposition, positionsdelar } from "../../src/rapport/ramDisposition";
import TidsupplosningVal from "../../src/rapport/TidsupplosningVal";
import Verktygsrad, { type MenyVal } from "../../src/rapport/Verktygsrad";

export const id = "ram";
export const rubrik = "Ram och navigering";
export const ordning = 60;

// Minsta bredd där verktygsraden ska rymmas (stilguiden 4.5).
const SMAL = 360;

const stil = {
  grupp: { marginTop: "var(--rum-7)" },
  rubrik: {
    fontFamily: "var(--typ-figurtitel-familj)", fontSize: "var(--typ-figurtitel-storlek)",
    lineHeight: "var(--typ-figurtitel-radhojd)", fontWeight: "var(--typ-figurtitel-vikt)",
  },
  text: {
    marginTop: "var(--rum-2)", maxWidth: "var(--matt-text)", fontFamily: "var(--typ-granssnitt-familj)",
    fontSize: "var(--typ-granssnitt-storlek)", lineHeight: "var(--typ-granssnitt-radhojd)", color: "var(--farg-text2)",
  },
  exempel: { marginTop: "var(--rum-4)", background: "var(--farg-papper)" },
  etikett: {
    marginTop: "var(--rum-4)", fontFamily: "var(--typ-not-familj)", fontSize: "var(--typ-not-storlek)",
    lineHeight: "var(--typ-not-radhojd)", color: "var(--farg-text3)",
  },
  smal: { width: SMAL, maxWidth: "100%" },
  spalt: { width: "var(--matt-toc)" },
} satisfies Record<string, CSSProperties>;

function Grupp({ rubrik, text, children }: { rubrik: string; text: string; children: ReactNode }) {
  return (
    <section style={stil.grupp}>
      <h3 style={stil.rubrik}>{rubrik}</h3>
      <p style={stil.text}>{text}</p>
      <div style={stil.exempel}>{children}</div>
    </section>
  );
}

const Etikett = ({ children }: { children: ReactNode }) => <p style={stil.etikett}>{children}</p>;

export function Sektion() {
  const [kapitel] = useState(skrUtdrag);
  const d = byggDisposition(kapitel);
  const forsta = d.avsnitt[0]?.indikatorer[0]?.id ?? d.indikatorer[0]?.id ?? "";
  const [aktivt, setAktivt] = useState(forsta);
  const [red, setRed] = useState(false);
  const [vy, setVy] = useState<VyId>("manad");
  const [arkOppet, setArkOppet] = useState(false);
  const delar = positionsdelar(d, aktivt);

  const meny: MenyVal[] = [
    { id: "pptx-kapitel", etikett: "PowerPoint (kapitlet)", onVal: () => {} },
    { id: "pptx-rapport", etikett: "PowerPoint (hela rapporten)", onVal: () => {} },
    { id: "skriv-ut", etikett: "Skriv ut", onVal: () => {} },
    { id: "kopiera-lank", etikett: "Kopiera länk till här", onVal: () => {} },
    { id: "redigera", etikett: "Redigeringsläge", kryssad: red, onVal: () => setRed((r) => !r) },
  ];

  // Länkar navigerar inte i stilguiden; en post i innehållet blir aktiv i stället.
  const fanga = (e: MouseEvent) => {
    const a = (e.target as Element).closest("a");
    if (!a) return;
    e.preventDefault();
    const blk = a.getAttribute("data-block-lank");
    if (blk) {
      setAktivt(blk);
      setArkOppet(false);
    }
  };

  return (
    <div onClickCapture={fanga} data-stilguide-ram="">
      <Grupp
        rubrik="Verktygsrad"
        text="Sticky, 56 px, papper. Vänster ← Alla kapitel, i mitten positionsraden, till höger Exportera. Hårlinjen under raden visas först när sidan rullats (här alltid)."
      >
        <Verktygsrad statisk meny={meny}>
          <Positionsrad delar={delar} />
        </Verktygsrad>
      </Grupp>

      <Grupp
        rubrik="Verktygsrad i 360 px"
        text="Positionsraden kortas till den aktuella delen och öppnar innehållet som ark. Exportera blir en ikon med etikett för skärmläsare."
      >
        <div style={stil.smal}>
          <Verktygsrad statisk meny={meny} ikonmeny>
            <Positionsrad delar={delar} kort onOppnaInnehall={() => setArkOppet(true)} innehallOppet={arkOppet} />
          </Verktygsrad>
        </div>
      </Grupp>

      <Grupp
        rubrik="Positionsrad"
        text="Not-storlek i text2, aktuell del i svart 600. Ingen statusmarkör och ingen förloppslinje."
      >
        <Etikett>Desktop (text)</Etikett>
        <Positionsrad delar={delar} />
        <Etikett>Mellan (knapp som öppnar arket)</Etikett>
        <Positionsrad delar={delar} onOppnaInnehall={() => setArkOppet(true)} innehallOppet={arkOppet} />
        <Etikett>Mobil (kortad knapp)</Etikett>
        <Positionsrad delar={delar} kort onOppnaInnehall={() => setArkOppet(true)} innehallOppet={arkOppet} />
        <Etikett>Ovanför första blocket</Etikett>
        <Positionsrad delar={positionsdelar(d, "")} />
      </Grupp>

      <Grupp
        rubrik="Innehållsförteckning som spalt"
        text="Från 1200 px, 220 px bred. Avsnittet fälls ut när läsaren är i det. Statusprick 6 px före indikatorn, aktiv indikator på fokusLjus. Klicka för att byta aktiv post."
      >
        <div style={stil.spalt}>
          <Innehall kapitel={kapitel} aktivt={aktivt} variant="spalt" />
        </div>
      </Grupp>

      <Grupp
        rubrik="Innehållsförteckning som ark"
        text="Under 1200 px öppnar positionsraden innehållet som ark nedifrån, med alla avsnitt utfällda. Escape, stängknappen och klick utanför stänger."
      >
        <Positionsrad delar={delar} onOppnaInnehall={() => setArkOppet(true)} innehallOppet={arkOppet} />
        <Innehall kapitel={kapitel} aktivt={aktivt} variant="ark" oppen={arkOppet} onStang={() => setArkOppet(false)} />
      </Grupp>

      <Grupp
        rubrik="Tidsupplösning"
        text="Textflikar sist i kapitlets metarad, bara när kapitlet finns i mer än en tidsupplösning. Pilarna flyttar, Enter eller mellanslag väljer."
      >
        <TidsupplosningVal vyer={["dag", "vecka", "manad", "kvartal", "ar"]} aktiv={vy} onByt={setVy} />
      </Grupp>
    </div>
  );
}
