// sektioner/ui.stilguide.tsx: grundkomponenterna i den levande stilguiden
// (stilguiden 5.1, 5.3, 5.4, 5.5, 5.9 och dialogen i 6.8). Ägare: WP4.
// Läses av verktyg/stilguide.tsx (WP7) via import.meta.glob; filen exporterar
// { id, rubrik, ordning, Sektion }.

import { useState, type CSSProperties, type ReactNode } from "react";
import type { Status } from "../../src/data/modell";
import Dialog from "../../src/ui/Dialog";
import Disclosure from "../../src/ui/Disclosure";
import Flikar from "../../src/ui/Flikar";
import Knapp from "../../src/ui/Knapp";
import Meny from "../../src/ui/Meny";
import StatusMarkor from "../../src/ui/StatusMarkor";
import Tabell from "../../src/ui/Tabell";

export const id = "ui";
export const rubrik = "Grundkomponenter";
export const ordning = 50;

const stil = {
  sektion: { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", rowGap: "var(--rum-7)" },
  rubrik: {
    margin: "0 0 var(--rum-2)",
    fontFamily: "var(--typ-figurtitel-familj)",
    fontSize: "var(--typ-figurtitel-storlek)",
    lineHeight: "var(--typ-figurtitel-radhojd)",
    fontWeight: "var(--typ-figurtitel-vikt)",
    color: "var(--farg-black)",
  },
  text: {
    maxInlineSize: "var(--matt-text)",
    margin: "0 0 var(--rum-4)",
    fontFamily: "var(--typ-granssnitt-familj)",
    fontSize: "var(--typ-granssnitt-storlek)",
    lineHeight: "var(--typ-granssnitt-radhojd)",
    color: "var(--farg-text2)",
  },
  rad: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--rum-4) var(--rum-6)" },
  lage: {
    display: "grid",
    rowGap: "var(--rum-2)",
    fontFamily: "var(--typ-not-familj)",
    fontSize: "var(--typ-not-storlek)",
    lineHeight: "var(--typ-not-radhojd)",
    color: "var(--farg-text3)",
  },
  brod: {
    maxInlineSize: "var(--matt-text)",
    margin: 0,
    fontFamily: "var(--typ-brod-familj)",
    fontSize: "var(--typ-brod-storlek)",
    lineHeight: "var(--typ-brod-radhojd)",
    color: "var(--farg-black)",
  },
  platta: { maxInlineSize: "var(--matt-figur)", padding: "var(--rum-5)", background: "var(--farg-yta)" },
  status: {
    margin: 0,
    minBlockSize: "1lh",
    fontFamily: "var(--typ-not-familj)",
    fontSize: "var(--typ-not-storlek)",
    lineHeight: "var(--typ-not-radhojd)",
    color: "var(--farg-text3)",
  },
} satisfies Record<string, CSSProperties>;

function Exempel({ rubrik, text, id, children }: { rubrik: string; text: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`ui-ex-${id}`} data-exempel={id}>
      <h3 id={`ui-ex-${id}`} style={stil.rubrik}>{rubrik}</h3>
      <p style={stil.text}>{text}</p>
      {children}
    </section>
  );
}

function Lage({ namn, children }: { namn: string; children: ReactNode }) {
  return (
    <div style={stil.lage}>
      <div>{children}</div>
      <span>{namn}</span>
    </div>
  );
}

const STATUSAR: Status[] = ["gron", "gul", "rod"];

export function Sektion() {
  const [vy, setVy] = useState("tid");
  const [niva, setNiva] = useState("region");
  const [dialog, setDialog] = useState(false);
  const [valt, setValt] = useState("");

  const valj = (namn: string) => () => setValt(`Valt: ${namn}`);

  return (
    <div style={stil.sektion} data-sektion="ui">
      <Exempel id="status" rubrik="Statusmarkör" text="Pill med ordet, enda radien i produkten. Inte klickbar. Beskrivande mått får ingen markör.">
        <div style={stil.rad}>
          {STATUSAR.map((s) => <StatusMarkor key={s} status={s} />)}
        </div>
      </Exempel>

      <Exempel id="knappar" rubrik="Knappar" text="Textknappen (figurens åtgärder) utan ram, understrykning vid hover. Grön ton för Jämför. Menyknappen är den enda inramade knappen.">
        <div style={stil.rad}>
          <Lage namn="Textknapp"><Knapp onClick={valj("Tabell")}>Tabell</Knapp></Lage>
          <Lage namn="Textknapp, fokuston"><Knapp ton="fokus" onClick={valj("Jämför")}>+ Jämför med region</Knapp></Lage>
          <Lage namn="Menyknapp"><Knapp typ="meny" onClick={valj("Exportera")}>Exportera</Knapp></Lage>
        </div>
      </Exempel>

      <Exempel id="meny" rubrik="Meny" text="Menyknapp med val. Pilarna flyttar, Enter väljer, Escape stänger och lämnar fokus på knappen.">
        <div style={stil.rad}>
          <Lage namn="Exportera (menyknapp)">
            <Meny
              etikett="Exportera"
              val={[
                { id: "pptx-kapitel", etikett: "PowerPoint, kapitlet", onVal: valj("PowerPoint, kapitlet") },
                { id: "pptx-allt", etikett: "PowerPoint, hela rapporten", onVal: valj("PowerPoint, hela rapporten") },
                { id: "skriv", etikett: "Skriv ut", onVal: valj("Skriv ut") },
                { id: "lank", etikett: "Kopiera länk till här", onVal: valj("Kopiera länk till här") },
              ]}
            />
          </Lage>
          <Lage namn="Ladda ner (textknapp)">
            <Meny
              etikett="Ladda ner"
              typ="text"
              val={[
                { id: "csv", etikett: "CSV för Excel", onVal: valj("CSV") },
                { id: "svg", etikett: "SVG", onVal: valj("SVG") },
                { id: "png", etikett: "PNG", onVal: valj("PNG") },
              ]}
            />
          </Lage>
        </div>
        <p style={stil.status} role="status">{valt}</p>
      </Exempel>

      <Exempel id="flikar" rubrik="Flikar" text="Textflikar för visning och nivå. Pilarna flyttar fokus, Enter eller mellanslag väljer. Visas bara när det finns mer än ett val.">
        <div style={stil.rad}>
          <Lage namn="Två val">
            <Flikar
              etikett="Visning"
              aktiv={vy}
              onByt={setVy}
              flikar={[{ id: "tid", etikett: "Över tid" }, { id: "rang", etikett: "Rangordning" }]}
            />
          </Lage>
          <Lage namn="Tre val">
            <Flikar
              etikett="Nivå"
              aktiv={niva}
              onByt={setNiva}
              flikar={[
                { id: "region", etikett: "Region Halland" },
                { id: "sjukhus", etikett: "Per sjukhus" },
                { id: "dag", etikett: "Per dag" },
              ]}
            />
          </Lage>
        </div>
      </Exempel>

      <Exempel id="fordjupning" rubrik="Fördjupning" text="Ett details-element med grön summering och en vinkel som vrids. Ingen ram eller bakgrund. Öppnas av sök i sidan och skrivs ut öppet.">
        <div style={{ display: "grid", rowGap: "var(--rum-5)" }}>
          <Disclosure summering="Om måttet, källan och påverkansfaktorer">
            <p style={stil.brod}>Andelen inkommande telefonsamtal till primärvården som besvarats samma dag, redovisat som ett genomsnitt av årets tolv månader.</p>
          </Disclosure>
          <Disclosure summering="Om måttet, källan och påverkansfaktorer (öppen)" oppen>
            <p style={stil.brod}>Högre andel är bättre. Tillgänglighetsgarantin innebär att den som söker kontakt med primärvården ska få kontakt samma dag.</p>
          </Disclosure>
        </div>
      </Exempel>

      <Exempel id="dialog" rubrik="Dialog" text="Modal dialog med fokusfälla. Escape eller Stäng stänger, och fokus går tillbaka till knappen som öppnade den.">
        <Knapp onClick={() => setDialog(true)} aria-haspopup="dialog" data-oppna-dialog="">Öppna dialog</Knapp>
        <Dialog oppen={dialog} onStang={() => setDialog(false)} etikett="Exempel på dialog">
          <div style={{ display: "grid", rowGap: "var(--rum-4)", maxInlineSize: "var(--matt-text)" }}>
            <p style={stil.brod}>Innehållet bakom dialogen kan inte nås med Tab eller mus medan den är öppen.</p>
            <Disclosure summering="Ett fokuserbart element i dialogen">
              <p style={stil.brod}>Tab och Skift+Tab cirkulerar mellan Stäng, summeringen och menyn.</p>
            </Disclosure>
            <Meny etikett="Ladda ner" typ="text" val={[{ id: "csv", etikett: "CSV för Excel", onVal: valj("CSV i dialogen") }]} />
          </div>
        </Dialog>
      </Exempel>

      <Exempel id="tabell" rubrik="Tabell" text="Huvud i 13 px 600, celler i 15 px. Tal högerställda med samma decimaler per kolumn, hårlinje mellan rader, ingen zebra. Fokusenhetens rad i 600.">
        <div style={stil.platta}>
          <div style={{ overflowX: "auto" }} role="region" aria-label="Exempeltabell" tabIndex={0}>
            <Tabell
              caption="Besök på akutmottagning per sjukhus, mars 2026"
              kolumner={["Sjukhus", "Besök", "Förändring", "Andel inom 4 timmar"]}
              rader={[
                ["Region Halland", 28700, 2350, 71.4],
                ["Halmstad", 13462, 1111, 68.2],
                ["Varberg", 8600, -697, 74.9],
                ["Kungsbacka", 6587, null, 73],
                ["Övriga", "..", "..", ".."],
              ]}
              fokusRad={0}
              format={{ decimaler: 1 }}
            />
          </div>
        </div>
      </Exempel>
    </div>
  );
}
