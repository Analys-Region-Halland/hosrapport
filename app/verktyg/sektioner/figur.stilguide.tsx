// sektioner/figur.stilguide.tsx: figurramen i den levande stilguiden (stilguiden
// 6.1, 6.2 och 6.8). Ägare: WP4. Läses av verktyg/stilguide.tsx (WP7) via
// import.meta.glob; filen exporterar { id, rubrik, ordning, Sektion }.
//
// Exemplen är handbyggda ChartSpec med exempeldata ur granskningssidan
// (docs/referens/stilguide-granskning.html) tills kpiTillSpec (WP1) finns.
// Diagrammet ritas av RENDERARE: platshållare tills WP2 och WP3 är sammanslagna.

import { useState, type CSSProperties, type ReactNode } from "react";
import type { ChartSpec, SpecSerie, VisningId } from "../../src/charts/spec";
import type { Punkt, TalFormat } from "../../src/data/modell";
import Figur from "../../src/figur/Figur";
import TabellVy from "../../src/figur/TabellVy";

export const id = "figur";
export const rubrik = "Figur";
export const ordning = 60;

// ════════════════════════════════════════════════════════════
//  Exempel 1: telefonsamtal besvarade samma dag (SKR via Kolada, 2016–2025)
// ════════════════════════════════════════════════════════════

const PROCENT: TalFormat = { enhet: "procent", decimaler: 1, etikett: "%" };
const AR = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const HALLAND = "0013";
const RIKET = "0000";
const INDIKATOR = "Telefonsamtal till primärvården som besvarats samma dag";
const MATT = "Andel samtal till primärvården som besvarats samma dag, procent.";

const TELEFON: [string, string, (number | null)[]][] = [
  ["0013", "Halland", [87.6, 95, 90.6, 93.3, 92.8, 93.2, 93.6, null, null, 89.8]],
  ["0000", "Riket", [87.4, 88.3, 86.7, 88, 90.2, 83.2, 86.3, 87, 87, 88.5]],
  ["0001", "Stockholm", [92, 92.5, 90.5, 93.9, 86.8, null, 84.2, null, null, null]],
  ["0003", "Uppsala", [89.6, 88.9, 89.1, 88.2, 86.7, 83.2, 83.5, 80.7, 88.8, 92.3]],
  ["0004", "Sörmland", [89.1, 87.8, 88.7, 82.7, 92.4, 80.6, 72.4, null, 69.7, null]],
  ["0005", "Östergötland", [85.3, 87.9, 81.7, 83.1, 90.7, 76.3, 80.7, null, 81.2, 84.4]],
  ["0006", "Jönköpings län", [99.8, 100, 99.9, 98.4, 97.2, 94.9, 95.5, 93.7, 89.4, 91]],
  ["0007", "Kronoberg", [93.2, 94.2, 94, 92.7, 94.5, null, 87.4, null, 91.1, 89.3]],
  ["0008", "Kalmar", [96.5, 96.7, 95, 92.8, 96.5, 92.6, 92.3, null, 94.2, 96.1]],
  ["0009", "Gotland", [78.3, 87.5, 78.8, 95.1, 92.4, 91.8, 95.2, 86.4, 86.7, 89.4]],
  ["0010", "Blekinge", [74.8, 82.8, 82.5, 83.2, 85.7, 72.8, 71.3, 82.3, 80.8, 82.4]],
  ["0012", "Skåne", [85.1, 81.4, 78.3, 83.1, 86.2, 84.4, 88.5, null, null, 95.2]],
  ["0014", "Västra Götalandsregionen", [85.9, 90.9, 88.2, 89.5, 92.9, 88.2, 94.7, 92.1, 92.4, 93.3]],
  ["0017", "Värmland", [80.8, 79.6, 81.5, 82.9, 77.2, 73.1, 83.9, null, null, 84.1]],
  ["0018", "Örebro län", [81.7, 82.3, 83.2, 84.7, 87.9, 80.1, 80.8, 74.6, 74.8, 78.8]],
  ["0019", "Västmanland", [89.8, 93.5, 91.8, null, 91.1, 84.5, 89.8, 88.2, 86.6, 93.4]],
  ["0020", "Dalarna", [91.1, 93.2, 90.2, 87.7, 94.9, 88.6, 87.5, 88.9, 87.2, 88.2]],
  ["0021", "Gävleborg", [93.6, 91, 89.4, 88.3, 90.3, 83.8, 85.8, 82.7, 86.8, 81.2]],
  ["0022", "Västernorrland", [92.3, 86.5, 87.6, 87.7, null, 83.5, 86.4, 83.6, 81.8, 78.3]],
  ["0023", "Jämtland Härjedalen", [81, 86.6, 90.1, 87.5, 89.1, 85.4, 86.1, 85.8, 85.8, 83.7]],
  ["0024", "Västerbotten", [80.6, 74.7, 81.7, 78.2, 87.4, 61.5, 76.7, 72.6, 73.1, 66.4]],
  ["0025", "Norrbotten", [85.9, 86.9, 89.8, 88.2, 88.7, 79.8, 82.9, 81.5, 78.1, 77.7]],
];

const arspunkter = (v: (number | null)[]): Punkt[] =>
  AR.map((a, i) => ({ period: `${a}-01-01`, etikett: String(a), varde: v[i] ?? null }));
const senaste = (v: (number | null)[]) => v[v.length - 1];
const regioner = TELEFON.filter(([id]) => id !== HALLAND && id !== RIKET);

const KALLA = { namn: "Nationella väntetidsdatabasen (Väntetider i vården), SKR", url: "https://skr.se/vantetiderivarden.html" };
const NOTER: ChartSpec["noter"] = [
  { typ: "lucka", text: "2023 och 2024 saknas för Halland." },
  { typ: "seriebrott", period: "2024-01-01", text: "Från 2024 mäts telefontillgängligheten på ett nytt sätt; jämför över brottet med försiktighet." },
];

function roll(id: string, fasta: string[]): Pick<SpecSerie, "roll" | "markeringIndex" | "interaktiv"> {
  if (id === HALLAND) return { roll: "fokus" };
  if (id === RIKET) return { roll: "referens" };
  const i = fasta.indexOf(id);
  return i >= 0 ? { roll: "markerad", markeringIndex: i, interaktiv: true } : { roll: "kontext", interaktiv: true };
}

function telefonSpec(visning: VisningId, fasta: string[]): ChartSpec {
  const jamforbara = regioner.map(([enhetId, namn, v]) => ({ enhetId, namn, senaste: senaste(v) }));
  const gemensamt = {
    id: "kolada-n79179",
    etiketter: [HALLAND, RIKET, ...fasta].map((serieId) => ({
      serieId, text: TELEFON.find(([id]) => id === serieId)?.[1] ?? serieId,
    })),
    jamforbara,
    noter: NOTER,
    kalla: KALLA,
  };

  if (visning === "rang") {
    const medVarde = TELEFON
      .filter(([id, , v]) => id !== RIKET && senaste(v) !== null)
      .sort((a, b) => (senaste(b[2]) ?? 0) - (senaste(a[2]) ?? 0));
    const rader = medVarde.map(([, namn, v], i) => [namn, senaste(v), i + 1]);
    return {
      ...gemensamt,
      typ: "rangordning",
      titel: "Regionerna rangordnade",
      undertitel: `${MATT} ${medVarde.length} regioner med värde, 2025.`,
      serier: [
        ...medVarde.map(([id, namn, v]) => ({ id, namn, enhetId: id, varde: senaste(v) ?? undefined, ...roll(id, fasta) })),
        { id: RIKET, namn: "Riket", enhetId: RIKET, roll: "referens" as const, varde: 88.5 },
      ],
      x: { typ: "linjar", noll: false, format: PROCENT },
      y: { typ: "kategori", noll: false, format: PROCENT },
      sammanfattning: `Rangordning som visar andelen samtal som besvarats samma dag 2025. Halland har 89,8 procent och plats 7 av ${medVarde.length}.`,
      tabell: {
        caption: "Regionerna rangordnade",
        kolumner: ["Region", "2025", "Plats"],
        rader,
        fokusRad: rader.findIndex(([namn]) => namn === "Halland"),
      },
      hojdklass: "rangordning",
    };
  }

  const ordnade = [...regioner].sort((a, b) => (senaste(b[2]) ?? -1) - (senaste(a[2]) ?? -1));
  const tabellrader = [TELEFON[0], TELEFON[1], ...ordnade].map(([, namn, v]) => [namn, ...v]);
  return {
    ...gemensamt,
    typ: "linje",
    titel: "Halland jämfört med övriga regioner",
    undertitel: `${MATT} 21 regioner och riket, 2016–2025.`,
    serier: TELEFON.map(([id, namn, v]) => ({ id, namn, enhetId: id, punkter: arspunkter(v), ...roll(id, fasta) })),
    x: { typ: "tid", noll: false, format: PROCENT },
    y: { typ: "linjar", noll: false, format: PROCENT },
    sammanfattning: "Linjediagram som visar andelen telefonsamtal till primärvården som besvarats samma dag för Halland 2016–2025. Senaste värde 89,8 procent, plats 7 av 19.",
    tabell: { caption: "Halland jämfört med övriga regioner", kolumner: ["Region", ...AR.map(String)], rader: tabellrader, fokusRad: 0 },
    hojdklass: "standard",
  };
}

// ════════════════════════════════════════════════════════════
//  Exempel 2: beläggning på Halmstads sjukhus (intern exempeldata, månad)
// ════════════════════════════════════════════════════════════

const MANADER = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const manadspunkter = (v: number[]): Punkt[] => v.map((varde, i) => {
  const m = (3 + i) % 12;
  const ar = 2024 + Math.floor((3 + i) / 12);
  return { period: `${ar}-${String(m + 1).padStart(2, "0")}-01`, etikett: `${MANADER[m]} ${String(ar).slice(2)}`, varde };
});
const SJUKHUS: [string, string, number[]][] = [
  ["halmstad", "Halmstad", [94.2, 91.4, 88.9, 88.9, 90, 91.7, 95, 96.2, 97.8, 99.1, 98.8, 98.1, 95.1, 93.4, 91.5, 92.5, 91.7, 94.8, 97.3, 97.9, 104.4, 100.4, 101.5, 98.8]],
  ["varberg", "Varberg", [90.7, 87.9, 85.6, 85.7, 86.3, 88.2, 91.9, 93.3, 94.7, 95.9, 95.8, 94.5, 91.6, 90.2, 87.6, 89, 88.8, 91, 93.8, 94.4, 100.9, 97, 97.6, 95.1]],
  ["kungsbacka", "Kungsbacka", [89.1, 86.9, 84.3, 84.7, 84.9, 87, 89.9, 91.5, 92.7, 94.4, 94.2, 92.8, 90.2, 88.7, 86.1, 86.9, 86.6, 89.7, 91.9, 93.5, 98.9, 95.8, 96.1, 93.9]],
];
const REGIONEN = [92.1, 89.4, 87.2, 87.3, 87.8, 89.5, 93.1, 94.7, 95.8, 97.5, 97.2, 95.9, 93.2, 91.5, 89.2, 90.1, 90, 92.7, 95, 96.1, 102.3, 98.6, 99.3, 96.9];
// Påhittade dagvärden för mars 2026, bara för att visa dagfliken.
const DAGAR: Punkt[] = Array.from({ length: 31 }, (_, i) => ({
  period: `2026-03-${String(i + 1).padStart(2, "0")}`,
  etikett: `${i + 1} mar`,
  varde: Math.round((96.9 + 3 * Math.sin(i / 2.3) + (i % 7 === 5 ? -4 : 0)) * 10) / 10,
}));
const INTERN_KALLA = { namn: "Regionens vårddatalager, Region Halland" };
const INTERN_NOT: ChartSpec["noter"] = [{ typ: "fotnot", text: "Exempeldata tills den interna kopplingen är på plats." }];
const MANAD_KOLUMN = manadspunkter(REGIONEN).map((p) => p.etikett);

function belaggSpec(visning: VisningId, dagar: boolean): ChartSpec {
  const gemensamt = {
    id: "akut-belaggning",
    jamforbara: [],
    noter: INTERN_NOT,
    kalla: INTERN_KALLA,
    x: { typ: "tid" as const, noll: false, format: PROCENT },
    y: { typ: "linjar" as const, noll: false, format: PROCENT },
  };
  if (dagar) {
    return {
      ...gemensamt,
      typ: "linje",
      titel: "Dag för dag",
      undertitel: "Andel belagda vårdplatser, procent. Halmstads sjukhus, 1–31 mar 2026.",
      etiketter: [{ serieId: "halmstad", text: "Halmstad" }],
      serier: [{ id: "halmstad", namn: "Halmstad", roll: "fokus", enhetId: "halmstad", punkter: DAGAR }],
      sammanfattning: "Linjediagram som visar andelen belagda vårdplatser per dag på Halmstads sjukhus i mars 2026.",
      tabell: {
        caption: "Dag för dag",
        kolumner: ["Dag", "Halmstad"],
        rader: DAGAR.map((p) => [p.etikett, p.varde]),
        fokusRad: undefined,
      },
      hojdklass: "standard",
    };
  }
  if (visning === "enheter") {
    return {
      ...gemensamt,
      typ: "smaMultiplar",
      titel: "Per sjukhus",
      undertitel: "Andel belagda vårdplatser, procent. Tre sjukhus, apr 2024–mar 2026.",
      etiketter: [],
      paneler: SJUKHUS.map(([enhetId, titel]) => ({ enhetId, titel })),
      serier: SJUKHUS.map(([id, namn, v]) => ({ id, namn, enhetId: id, roll: "fokus" as const, punkter: manadspunkter(v) })),
      sammanfattning: "Små multiplar som visar andelen belagda vårdplatser per månad för tre sjukhus i Halland, april 2024 till mars 2026.",
      tabell: {
        caption: "Per sjukhus",
        kolumner: ["Månad", ...SJUKHUS.map(([, namn]) => namn)],
        rader: MANAD_KOLUMN.map((m, i) => [m, ...SJUKHUS.map(([, , v]) => v[i])]),
      },
      hojdklass: "kompakt",
    };
  }
  return {
    ...gemensamt,
    typ: "linje",
    titel: "Halmstad jämfört med Region Halland",
    undertitel: "Andel belagda vårdplatser, procent. Halmstads sjukhus och Region Halland, per månad apr 2024–mar 2026.",
    etiketter: [{ serieId: "halmstad", text: "Halmstad" }, { serieId: HALLAND, text: "Region Halland" }],
    serier: [
      { id: "halmstad", namn: "Halmstad", roll: "fokus", enhetId: "halmstad", punkter: manadspunkter(SJUKHUS[0][2]) },
      { id: HALLAND, namn: "Region Halland", roll: "referens", enhetId: HALLAND, punkter: manadspunkter(REGIONEN) },
    ],
    sammanfattning: "Linjediagram som visar andelen belagda vårdplatser per månad på Halmstads sjukhus jämfört med Region Halland, april 2024 till mars 2026.",
    tabell: {
      caption: "Halmstad jämfört med Region Halland",
      kolumner: ["Månad", "Halmstad", "Region Halland"],
      rader: MANAD_KOLUMN.map((m, i) => [m, SJUKHUS[0][2][i], REGIONEN[i]]),
      fokusRad: undefined,
    },
    hojdklass: "standard",
  };
}

// ════════════════════════════════════════════════════════════
//  Sektionen
// ════════════════════════════════════════════════════════════

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

const VISNINGAR_REGION: { id: VisningId; etikett: string }[] = [
  { id: "tid", etikett: "Över tid" },
  { id: "rang", etikett: "Rangordning" },
];
const VISNINGAR_SJUKHUS: { id: VisningId; etikett: string }[] = [
  { id: "tid", etikett: "Halmstad" },
  { id: "enheter", etikett: "Per sjukhus" },
];
const BRODSMULA = [
  { id: HALLAND, namn: "Region Halland" },
  { id: "sjukhus", namn: "Hallands sjukhus" },
  { id: "halmstad", namn: "Halmstad" },
];

export function Sektion() {
  const [visning, setVisning] = useState<VisningId>("tid");
  const [fasta, setFasta] = useState<string[]>(["0001", "0012"]);
  const [visning2, setVisning2] = useState<VisningId>("tid");
  const [dagar, setDagar] = useState(false);
  const [fokus, setFokus] = useState("halmstad");

  return (
    <div style={stil.sektion} data-sektion="figur">
      <Exempel
        id="indikator"
        rubrik="Figuren i en indikator"
        text="Titel, undertitel, flikar för visningen, plotytan, jämför-raden med två fästa regioner, not och källrad med åtgärderna. Fästa regioner delas mellan flikarna, tabellen och förstoringen."
      >
        <Figur
          spec={telefonSpec(visning, fasta)}
          rubrikniva={4}
          visningar={VISNINGAR_REGION}
          visning={visning}
          onVisning={setVisning}
          fasta={fasta}
          onFasta={setFasta}
          indikatornamn={INDIKATOR}
        />
      </Exempel>

      <Exempel
        id="niva"
        rubrik="Nivåflik, dagflik och brödsmula"
        text="Fokus under regionnivå ger brödsmulan ovanför plotytan. Flikarna visar enhetens egen serie, alla sjukhus och dag för dag. Utan jämförbara serier visas ingen jämför-rad."
      >
        <Figur
          spec={belaggSpec(visning2, dagar)}
          rubrikniva={4}
          visningar={VISNINGAR_SJUKHUS}
          visning={visning2}
          onVisning={setVisning2}
          dagFlik={{ pa: dagar, onByt: setDagar }}
          brodsmula={BRODSMULA.slice(0, BRODSMULA.findIndex((b) => b.id === fokus) + 1)}
          onFokus={setFokus}
          indikatornamn="Beläggningsgrad"
        />
      </Exempel>

      <Exempel
        id="tabellvy"
        rubrik="Tabellvyn"
        text="Samma tabell som knappen Tabell visar, här med synlig caption. Fokusraden i 600, tal högerställda med en decimal, saknade värden som tankstreck med förklaring under."
      >
        <div style={stil.platta}>
          <TabellVy tabell={telefonSpec("tid", []).tabell} format={PROCENT} captionSynlig />
        </div>
      </Exempel>
    </div>
  );
}
