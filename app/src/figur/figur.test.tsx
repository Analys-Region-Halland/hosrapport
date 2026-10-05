// Tester för figurramen och dess delar, renderade till HTML utan DOM
// (react-dom/server). Beteende med mus och tangentbord prövas i webbläsaren.
// Ägare: WP4.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ChartSpec } from "../charts/spec";
import Tabell from "../ui/Tabell";
import StatusMarkor from "../ui/StatusMarkor";
import { begransaFasta, jamforNamn, markeringsIndex, vaxlaFast } from "./fasta";
import Figur from "./Figur";
import JamforRad from "./JamforRad";
import Noter from "./Noter";
import TabellVy from "./TabellVy";

const procent = { enhet: "procent", decimaler: 1, etikett: "%" } as const;

function spec(over: Partial<ChartSpec> = {}): ChartSpec {
  return {
    id: "kolada-n79179",
    typ: "linje",
    titel: "Halland jämfört med övriga regioner",
    undertitel: "Andel samtal besvarade samma dag, procent. 21 regioner och riket, 2016–2025.",
    etiketter: [],
    jamforbara: [
      { enhetId: "0012", namn: "Skåne", senaste: 95.2 },
      { enhetId: "0001", namn: "Stockholm", senaste: null },
      { enhetId: "0010", namn: "Blekinge", senaste: 82.4 },
    ],
    serier: [{ id: "0013", namn: "Halland", roll: "fokus", enhetId: "0013", punkter: [] }],
    x: { typ: "tid", noll: false, format: procent },
    y: { typ: "linjar", noll: false, format: procent },
    noter: [
      { typ: "lucka", text: "2023 och 2024 saknas för Halland." },
      { typ: "seriebrott", text: "Från 2024 mäts tillgängligheten på ett nytt sätt." },
    ],
    kalla: { namn: "Väntetider i vården, SKR", url: "https://skr.se" },
    sammanfattning: "Linjediagram som visar andelen samtal som besvarats samma dag för Halland.",
    tabell: {
      caption: "Halland jämfört med övriga regioner",
      kolumner: ["Region", "2016", "2017", "Plats"],
      rader: [["Halland", 87.6, 95, 7], ["Skåne", 85.1, null, 3], ["Riket", 87.4, 88.3, null], ["Övriga", "..", "..", null]],
      fokusRad: 0,
    },
    hojdklass: "standard",
    ...over,
  };
}

describe("fästa serier", () => {
  it("högst fyra, den femte ersätter den äldsta", () => {
    expect(vaxlaFast(["a", "b", "c", "d"], "e")).toEqual(["b", "c", "d", "e"]);
    expect(vaxlaFast(["a", "b"], "a")).toEqual(["b"]);
    expect(begransaFasta(["a", "b", "a", "c", "d", "e", "f"])).toEqual(["c", "d", "e", "f"]);
  });

  it("färg ur spec när den finns, annars plats i listan", () => {
    const s = spec({ serier: [{ id: "0012", namn: "Skåne", roll: "markerad", enhetId: "0012", markeringIndex: 3 }] });
    expect(markeringsIndex(s, ["0001", "0012"], "0012")).toBe(3);
    expect(markeringsIndex(s, ["0001", "0012"], "0001")).toBe(0);
    expect(jamforNamn(s, "0010")).toBe("Blekinge");
    expect(jamforNamn(s, "okand")).toBe("okand");
  });
});

describe("tabellen", () => {
  const html = renderToStaticMarkup(<TabellVy tabell={spec().tabell} format={procent} />);

  it("är en riktig table med caption = titel", () => {
    expect(html).toMatch(/<table[^>]*>\s*<caption[^>]*>Halland jämfört med övriga regioner<\/caption>/);
    expect(html.match(/<th scope="col"/g)).toHaveLength(4);
    expect(html.match(/<th scope="row"/g)).toHaveLength(4);
  });

  it("formaterar tal per kolumn och markerar fokusraden", () => {
    expect(html).toContain(">87,6<");
    expect(html).toContain(">95,0<");          // samma decimaler i kolumnen
    expect(html).toContain(">7<");             // heltalskolumn utan decimaler
    expect(html).toContain("data-fokus");
    expect(html).toContain(">–<");        // saknas
    expect(html).toContain(">..<");            // för få fall
    expect(html).toContain("betyder att värde saknas");
    expect(html).toContain("för få fall");
  });

  it("tusental med hårt mellanslag och typografiskt minus", () => {
    const t = renderToStaticMarkup(
      <Tabell caption="T" kolumner={["Enhet", "Besök"]} rader={[["A", 12345], ["B", -697]]} />,
    );
    expect(t).toContain(">12 345<");
    expect(t).toContain(">−697<");
  });
});

describe("figuren", () => {
  const full = renderToStaticMarkup(
    <Figur
      spec={spec()}
      rubrikniva={4}
      visningar={[{ id: "tid", etikett: "Över tid" }, { id: "rang", etikett: "Rangordning" }]}
      fasta={["0012", "0001"]}
    />,
  );

  it("har titel som h4, undertitel, noter och källa som HTML", () => {
    expect(full).toMatch(/<figure[^>]*aria-labelledby/);
    expect(full).toMatch(/<figcaption[^>]*><h4[^>]*>Halland jämfört med övriga regioner<\/h4>/);
    expect(full).toContain("Andel samtal besvarade samma dag, procent.");
    expect(full).toContain("Not: 2023 och 2024 saknas för Halland. Från 2024 mäts tillgängligheten på ett nytt sätt.");
    expect(full).toContain('Källa: <a href="https://skr.se">Väntetider i vården, SKR</a>');
  });

  it("har flikar, jämför-rad med chips och åtgärder", () => {
    expect(full).toContain('role="tablist"');
    expect(full.match(/role="tab"/g)).toHaveLength(2);
    expect(full).toContain('role="tabpanel"');
    expect(full).toContain("+ Jämför med region");
    expect(full).toContain('aria-label="Ta bort Skåne ur grafen"');
    expect(full).toContain('aria-label="Ta bort Stockholm ur grafen"');
    expect(full).toContain("var(--farg-diagram-markering-0)");
    expect(full).toContain("Rensa");
    expect(full).toContain('data-atgard="tabell"');
    expect(full).toContain(">Ladda ner<");
    expect(full).toContain('data-atgard="forstora"');
  });

  it("visar inga flikar med ett val, ingen jämför-rad utan jämförbara och bara valda åtgärder", () => {
    const enkel = renderToStaticMarkup(
      <Figur spec={spec({ jamforbara: [], kalla: undefined })} visningar={[{ id: "tid", etikett: "Över tid" }]} atgarder={["tabell"]} />,
    );
    expect(enkel).not.toContain('role="tablist"');
    expect(enkel).not.toContain("Jämför med");
    expect(enkel).not.toContain("Källa:");
    expect(enkel).toContain('data-atgard="tabell"');
    expect(enkel).not.toContain("Ladda ner");
    expect(enkel).not.toContain("Förstora");
    expect(enkel).toMatch(/<h3/);
  });

  it("lägger till dagfliken och brödsmulan", () => {
    const html = renderToStaticMarkup(
      <Figur
        spec={spec()}
        visningar={[{ id: "tid", etikett: "Halmstad" }]}
        dagFlik={{ pa: true, onByt: () => {} }}
        brodsmula={[{ id: "0013", namn: "Region Halland" }, { id: "halmstad", namn: "Halmstad" }]}
      />,
    );
    expect(html).toMatch(/aria-selected="true"[^>]*data-flik="dag"/);
    expect(html).toContain('aria-label="Nivå"');
    expect(html).toContain('<span aria-current="location">Halmstad</span>');
  });

  it("visar kicker bara när spec har en", () => {
    expect(full).not.toContain("data-kicker");
    const fri = renderToStaticMarkup(<Figur spec={spec({ kicker: "Telefonsamtal besvarade samma dag" })} />);
    expect(fri).toContain('data-kicker="">Telefonsamtal besvarade samma dag</p>');
  });
});

describe("små delar", () => {
  it("jämför-raden och noterna försvinner när de saknar innehåll", () => {
    expect(renderToStaticMarkup(<JamforRad spec={spec({ jamforbara: undefined })} fasta={[]} onFasta={() => {}} />)).toBe("");
    expect(renderToStaticMarkup(<Noter noter={[]} />)).toBe("");
  });

  it("statusmarkören har ordet", () => {
    expect(renderToStaticMarkup(<StatusMarkor status="gul" />)).toContain(">Bevaka<");
    expect(renderToStaticMarkup(<StatusMarkor status="gron" />)).toContain(">I fas<");
    expect(renderToStaticMarkup(<StatusMarkor status="rod" />)).toContain(">Avvikelse<");
  });
});
