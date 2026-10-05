// sektioner/begrepp.stilguide.tsx: stilguidens sektion för begrepp (stilguiden 5.7).
// Visar löptext med länkade begrepp (Prosa), popover och ark, och hela
// begreppslistan ur innehall/begrepp.json. Ägare: WP5. Globbas av stilguide.tsx
// (WP7), som läser { id, rubrik, ordning, Sektion }.

import { useState, type CSSProperties, type ReactNode } from "react";
import Begrepp, { BegreppInnehall } from "../../src/begrepp/Begrepp";
import { BegreppLista } from "../../src/begrepp/BegreppSida";
import Prosa from "../../src/begrepp/Prosa";
import { BEGREPP, hittaBegrepp } from "../../src/begrepp/register";
import Ark from "../../src/ui/Ark";

export const id = "begrepp";
export const rubrik = "Begrepp";
export const ordning = 57;

// Exempeltext i samma form som rapportens genererade analys (stilguiden 3.4).
const ANALYS =
  "Region Halland redovisar ett utfall på 87,7 procent (2025) och placerar sig på plats 8 av 21 bland regionerna. " +
  "Resultatet ligger under målsättningen om en plats bland de tre främsta regionerna. Sedan 2020 har utfallet " +
  "förbättrats, från 81,6 till 87,7. Sett till riket står sig regionen bättre än rikssnittet på 86,4 procent.";

const FORDJUPNING =
  "Från 2024 mäts telefontillgängligheten på ett nytt sätt, vilket ger ett [[seriebrott|brott i tidsserien]]. " +
  "Tillgänglighetsgarantin innebär att den som söker kontakt med primärvården ska få det samma dag.\n\n" +
  "Rikssnittet står här igen men länkas inte, eftersom det redan är länkat i analysen. Detsamma gäller topp 3, " +
  "som länkades som formen de tre främsta.";

const AKUT =
  "Medianväntetiden ligger på 182 minuter, inom det förväntade intervallet, och indikatorn ligger i fas. " +
  "Beläggningsgraden på ett av sjukhusen är under bevakning medan regionen som helhet ligger i fas, eftersom " +
  "aggregatet räknas på hela underlaget.";

const PROVENIENS = "AI-analys, genererad ur rapportens data.";

const stil = {
  grupp: { marginTop: "var(--rum-7)" },
  rubrik: {
    fontFamily: "var(--typ-figurtitel-familj)", fontSize: "var(--typ-figurtitel-storlek)",
    lineHeight: "var(--typ-figurtitel-radhojd)", fontWeight: "var(--typ-figurtitel-vikt)",
  },
  forklaring: {
    marginTop: "var(--rum-2)", maxWidth: "var(--matt-text)", color: "var(--farg-text2)",
    fontFamily: "var(--typ-granssnitt-familj)", fontSize: "var(--typ-granssnitt-storlek)",
    lineHeight: "var(--typ-granssnitt-radhojd)",
  },
  brod: {
    marginTop: "var(--rum-4)", maxWidth: "var(--matt-text)", color: "var(--farg-black)",
    fontFamily: "var(--typ-brod-familj)", fontSize: "var(--typ-brod-storlek)", lineHeight: "var(--typ-brod-radhojd)",
  },
  etikett: {
    marginTop: "var(--rum-5)", color: "var(--farg-text2)",
    fontFamily: "var(--typ-granssnitt-familj)", fontSize: "var(--typ-granssnitt-storlek)",
    lineHeight: "var(--typ-granssnitt-radhojd)", fontWeight: "var(--typ-granssnitt-viktStark)",
  },
  not: {
    marginTop: "var(--rum-2)", color: "var(--farg-text3)",
    fontFamily: "var(--typ-not-familj)", fontSize: "var(--typ-not-storlek)", lineHeight: "var(--typ-not-radhojd)",
  },
  knapp: {
    marginTop: "var(--rum-4)", minHeight: "var(--komponent-klickyta)", color: "var(--farg-fokus)",
    fontFamily: "var(--typ-granssnitt-familj)", fontSize: "var(--typ-granssnitt-storlek)",
    fontWeight: "var(--typ-granssnitt-viktStark)", textDecoration: "underline",
    textDecorationThickness: "var(--typ-lank-understrykning)", textUnderlineOffset: "var(--typ-lank-avstand)",
    cursor: "pointer",
  },
} satisfies Record<string, CSSProperties>;

function Grupp({ titel, forklaring, children }: { titel: string; forklaring: ReactNode; children: ReactNode }) {
  return (
    <section style={stil.grupp}>
      <h3 style={stil.rubrik}>{titel}</h3>
      <p style={stil.forklaring}>{forklaring}</p>
      {children}
    </section>
  );
}

export function Sektion() {
  // Två omfång, som två indikatorer: ett för SKR-exemplet och ett för akutflödet.
  const [skr] = useState(() => new Set<string>());
  const [akut] = useState(() => new Set<string>());
  const [arkOppet, setArkOppet] = useState(false);
  const [arkKnapp, setArkKnapp] = useState<HTMLButtonElement | null>(null);
  const exempel = hittaBegrepp(BEGREPP, "forvantat-intervall");
  const granskade = BEGREPP.filter((b) => b.granskad).length;

  return (
    <div data-sektion="begrepp">
      <p style={stil.forklaring}>
        Begrepp länkas i löptext med en prickad understrykning. Bara första förekomsten per indikator länkas, aldrig i
        rubriker, knappar eller tabeller. Klick, Enter eller mellanslag öppnar en popover från 640 px och ett ark
        under 640 px. Escape, klick utanför eller samma ord stänger, och fokus går tillbaka till ordet.
      </p>

      <Grupp
        titel="Löptext med länkade begrepp"
        forklaring="Analys och fördjupning för en indikator delar omfång. Formen och den explicita markeringen [[seriebrott|brott i tidsserien]] länkas till samma begrepp som termen."
      >
        <p style={stil.etikett}>Analys</p>
        <div style={stil.brod}><Prosa text={ANALYS} redan={skr} /></div>
        <div style={stil.not}><Prosa text={PROVENIENS} redan={skr} /></div>
        <p style={stil.etikett}>Fördjupning, samma indikator</p>
        <div style={stil.brod}><Prosa text={FORDJUPNING} redan={skr} /></div>
        <p style={stil.etikett}>Akutflöde, en annan indikator</p>
        <div style={stil.brod}><Prosa text={AKUT} redan={akut} /></div>
      </Grupp>

      <Grupp
        titel="Popover och ark"
        forklaring="Begreppet öppnas som popover på bredare skärmar och som ark under 640 px. Arket kan också visas på bred skärm med knappen. Ett begrepp i arket öppnar ett lager till, och Escape stänger bara det översta."
      >
        <p style={stil.brod}>
          Ett enstaka begrepp i text: värdet ligger utanför det{" "}
          <Begrepp id="forvantat-intervall">förväntade intervallet</Begrepp> för första gången i år.
        </p>
        <button type="button" ref={setArkKnapp} style={stil.knapp} onClick={() => setArkOppet((o) => !o)}
          aria-expanded={arkOppet} data-visa-ark="">
          Visa arket
        </button>
        {exempel && (
          <Ark oppen={arkOppet} onStang={() => setArkOppet(false)} etikett={exempel.term} ankare={arkKnapp}>
            <BegreppInnehall begrepp={exempel} />
            <div style={stil.not}>
              <Prosa text="Ett lager till: medianen öppnas ovanpå arket." />
            </div>
          </Ark>
        )}
      </Grupp>

      <Grupp
        titel="Begreppslistan"
        forklaring={`${BEGREPP.length} begrepp, ${granskade} granskade av sakkunnig. Samma lista som på #/begrepp, alfabetisk, med ankare per begrepp.`}
      >
        <div style={{ marginTop: "var(--rum-5)" }}>
          <BegreppLista rubrikniva={4} />
        </div>
      </Grupp>
    </div>
  );
}
