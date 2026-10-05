// sektioner/figur.stilguide.tsx: figurramen i den levande stilguiden (stilguiden
// 6.1, 6.2 och 6.8). Ägare: WP4. Läses av verktyg/stilguide.tsx (WP7) via
// import.meta.glob; filen exporterar { id, rubrik, ordning, Sektion }.
//
// Exemplen är riktiga specar ur WP1:s fixturer (kpiTillSpec). Diagrammet ritas
// av graftypens renderare (RENDERARE).

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { kpiTillSpec, visningar } from "../../src/charts/kpiTillSpec";
import type { VisningId } from "../../src/charts/spec";
import { akutflodeUtdrag, hierarki, skrUtdrag } from "../../src/data/fixturer";
import { HALLAND_ID, type KapitelModell, type KpiModell } from "../../src/data/modell";
import Figur from "../../src/figur/Figur";
import TabellVy from "../../src/figur/TabellVy";

export const id = "figur";
export const rubrik = "Figur";
export const ordning = 60;

const stil = {
  sektion: { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", rowGap: "var(--rum-8)" },
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
    margin: "0 0 var(--rum-5)",
    fontFamily: "var(--typ-granssnitt-familj)",
    fontSize: "var(--typ-granssnitt-storlek)",
    lineHeight: "var(--typ-granssnitt-radhojd)",
    color: "var(--farg-text2)",
  },
  platta: { maxInlineSize: "var(--matt-figur)", padding: "var(--rum-5)", background: "var(--farg-yta)" },
} satisfies Record<string, CSSProperties>;

function Exempel({ rubrik, text, id, children }: { rubrik: string; text: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`figur-ex-${id}`} data-exempel={id}>
      <h3 id={`figur-ex-${id}`} style={stil.rubrik}>{rubrik}</h3>
      <p style={stil.text}>{text}</p>
      {children}
    </section>
  );
}

function hamta(kap: KapitelModell, kpiId: string): KpiModell {
  const kpi = kap.kpier.find((k) => k.id === kpiId);
  if (!kpi) throw new Error(`Fixturen saknar ${kpiId}`);
  return kpi;
}

/** Brödsmulan från regionen ned till fokusenheten, ur kapitlets enheter. */
function brodsmula(kap: KapitelModell, fokus: string): { id: string; namn: string }[] {
  const ut: { id: string; namn: string }[] = [];
  let e = kap.enheter.find((x) => x.id === fokus);
  while (e) {
    ut.unshift({ id: e.id, namn: e.namn });
    const forald = e.parent_id;
    e = forald ? kap.enheter.find((x) => x.id === forald) : undefined;
  }
  return ut;
}

/** Exempel 1: telefonsamtal besvarade samma dag, regioner och riket, med två fästa regioner. */
function Telefon() {
  const kap = useMemo(() => skrUtdrag(), []);
  const kpi = hamta(kap, "kolada-n79179");
  const [visning, setVisning] = useState<VisningId>("tid");
  const [fasta, setFasta] = useState<string[]>(["0001", "0012"]);
  const ctx = { vy: "ar" as const, fasta };
  return (
    <Figur
      spec={kpiTillSpec(kpi, kap, ctx, visning)}
      rubrikniva={4}
      visningar={visningar(kpi, kap, ctx)}
      visning={visning}
      onVisning={setVisning}
      fasta={fasta}
      onFasta={setFasta}
      indikatornamn={kpi.namn}
    />
  );
}

/** Exempel 2: beläggning i akutflödet, nivåflikar och dagfliken. */
function Belaggning() {
  const kap = useMemo(() => akutflodeUtdrag(), []);
  const kpi = hamta(kap, "belaggning");
  const [visning, setVisning] = useState<VisningId>("tid");
  const [dagar, setDagar] = useState(false);
  const ctx = { vy: "manad" as const, dagar };
  return (
    <Figur
      spec={kpiTillSpec(kpi, kap, ctx, dagar ? "tid" : visning)}
      rubrikniva={4}
      visningar={visningar(kpi, kap, { vy: "manad" })}
      visning={visning}
      onVisning={setVisning}
      dagFlik={{ pa: dagar, onByt: setDagar }}
      indikatornamn={kpi.namn}
    />
  );
}

/** Exempel 3: påhittad hierarki med fokus på ett sjukhus, brödsmula och jämförelse med andra sjukhus. */
function Hierarki() {
  const kap = useMemo(() => hierarki(), []);
  const kpi = kap.kpier[0];
  const [fokus, setFokus] = useState("halmstad");
  const [visning, setVisning] = useState<VisningId>("tid");
  const [fasta, setFasta] = useState<string[]>([]);
  const ctx = { vy: "manad" as const, fokus, fasta };
  const bytFokus = (id: string) => { setFokus(id); setFasta([]); setVisning("tid"); };
  return (
    <Figur
      key={fokus}
      spec={kpiTillSpec(kpi, kap, ctx, visning)}
      rubrikniva={4}
      visningar={visningar(kpi, kap, ctx)}
      visning={visning}
      onVisning={setVisning}
      brodsmula={fokus === HALLAND_ID ? undefined : brodsmula(kap, fokus)}
      onFokus={bytFokus}
      fasta={fasta}
      onFasta={setFasta}
      indikatornamn={kpi.namn}
    />
  );
}

function Tabellvyn() {
  const kap = useMemo(() => skrUtdrag(), []);
  const spec = kpiTillSpec(hamta(kap, "kolada-n79179"), kap, { vy: "ar" }, "tid");
  return (
    <div style={stil.platta}>
      <TabellVy tabell={spec.tabell} format={spec.y.format} captionSynlig />
    </div>
  );
}

export function Sektion() {
  return (
    <div style={stil.sektion} data-sektion="figur">
      <Exempel
        id="indikator"
        rubrik="Figuren i en indikator"
        text="Titel, undertitel, flikar för visningen, plotytan, jämför-raden med två fästa regioner, not och källrad med åtgärderna. Fästa regioner delas mellan flikarna, tabellen och förstoringen."
      >
        <Telefon />
      </Exempel>

      <Exempel
        id="niva"
        rubrik="Nivåflikar och dagfliken"
        text="Region Halland, sjukhusen och dag för dag. Utan jämförbara serier visas ingen jämför-rad. Högst fyra flikar på raden."
      >
        <Belaggning />
      </Exempel>

      <Exempel
        id="brodsmula"
        rubrik="Brödsmula under regionnivå"
        text="Med fokus på ett sjukhus står brödsmulan ovanför plotytan och jämförelsen gäller de andra sjukhusen. Klick på Region Halland går upp en nivå."
      >
        <Hierarki />
      </Exempel>

      <Exempel
        id="tabellvy"
        rubrik="Tabellvyn"
        text="Samma tabell som knappen Tabell visar, här med synlig caption. Fokusraden i 600, tal högerställda med en decimal, saknade värden som tankstreck med förklaring under."
      >
        <Tabellvyn />
      </Exempel>
    </div>
  );
}
