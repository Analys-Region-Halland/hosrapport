// Tester för figur/nedladdning.ts: filnamn, CSV för svensk Excel och
// sammansättningen av SVG-exporten (stilguiden 6.8). Ägare: WP4.

import { describe, expect, it } from "vitest";
import type { ChartSpec } from "../charts/spec";
import { tema } from "../design/tema";
import {
  byggExportSvg, csvCell, exportText, figurFilnamn, filnamn, periodspann, radbryt, slug,
  svgStorlek, tidsupplosning, tillCsv,
} from "./nedladdning";

const procent = { enhet: "procent", decimaler: 1, etikett: "%" } as const;

function exempel(over: Partial<ChartSpec> = {}): ChartSpec {
  return {
    id: "kolada-n79179",
    typ: "linje",
    titel: "Halland jämfört med övriga regioner",
    undertitel: "Andel samtal besvarade samma dag, procent. 21 regioner och riket, 2016–2025.",
    etiketter: [],
    serier: [
      {
        id: "0013", namn: "Halland", roll: "fokus", enhetId: "0013",
        punkter: [
          { period: "2016-01-01", etikett: "2016", varde: 87.6 },
          { period: "2017-01-01", etikett: "2017", varde: 95 },
          { period: "2025-01-01", etikett: "2025", varde: 89.8 },
        ],
      },
    ],
    x: { typ: "tid", noll: false, format: procent },
    y: { typ: "linjar", noll: false, format: procent },
    noter: [{ typ: "seriebrott", text: "Från 2024 mäts tillgängligheten på ett nytt sätt." }],
    kalla: { namn: "Väntetider i vården, SKR", url: "https://skr.se" },
    sammanfattning: "Linjediagram som visar andelen samtal som besvarats samma dag för Halland 2016–2025.",
    tabell: {
      caption: "Halland jämfört med övriga regioner",
      kolumner: ["Region", "2016", "2017"],
      rader: [["Halland", 87.6, 95], ["Västra Götaland", 85.9, null], ["Riket", -3.25, 1234.5]],
      fokusRad: 0,
    },
    hojdklass: "standard",
    ...over,
  };
}

describe("filnamn", () => {
  it("gör slug av indikator, vy och period", () => {
    expect(slug("jan 2021–mar 2026")).toBe("jan-2021-mar-2026");
    expect(slug("Västra Götaland")).toBe("vastra-gotaland");
    expect(filnamn(exempel(), "ar", "2016–2025", "csv")).toBe("kolada-n79179-ar-2016-2025.csv");
    expect(filnamn(exempel(), "rang", "", "png")).toBe("kolada-n79179-rang.png");
  });

  it("härleder tidsupplösning och period ur serierna", () => {
    expect(tidsupplosning(exempel())).toBe("ar");
    expect(periodspann(exempel())).toEqual({ fran: "2016-01-01", till: "2025-01-01" });
    expect(figurFilnamn(exempel(), "tid", "csv")).toBe("kolada-n79179-ar-2016-2025.csv");

    const manad = exempel({
      serier: [{
        id: "x", namn: "x", roll: "fokus",
        punkter: [
          { period: "2021-01-01", etikett: "jan 21", varde: 1 },
          { period: "2021-02-01", etikett: "feb 21", varde: 2 },
          { period: "2026-03-01", etikett: "mar 26", varde: 3 },
        ],
      }],
    });
    expect(tidsupplosning(manad)).toBe("manad");
    expect(figurFilnamn(manad, "tid", "svg")).toBe("kolada-n79179-manad-jan-2021-mar-2026.svg");
  });

  it("faller tillbaka på visningen när serierna saknar punkter", () => {
    const rang = exempel({ typ: "rangordning", serier: [{ id: "a", namn: "a", roll: "kontext", varde: 3 }] });
    expect(figurFilnamn(rang, "rang", "csv")).toBe("kolada-n79179-rang.csv");
  });
});

describe("CSV för svensk Excel", () => {
  it("börjar med BOM, använder semikolon, decimalkomma och CRLF", () => {
    const csv = tillCsv(exempel());
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const rader = csv.slice(1).split("\r\n");
    expect(rader).toEqual([
      "Region;2016;2017",
      "Halland;87,6;95",
      "Västra Götaland;85,9;",
      "Riket;-3,25;1234,5",
      "",
    ]);
  });

  it("skriver tal utan tusentalsavgränsare och med vanligt minus", () => {
    expect(csvCell(12345.6)).toBe("12345,6");
    expect(csvCell(-0.5)).toBe("-0,5");
    expect(csvCell(0.1 + 0.2)).toBe("0,3");
    expect(csvCell(null)).toBe("");
    expect(csvCell(Number.NaN)).toBe("");
  });

  it("citerar text med semikolon eller citattecken och skyddar mot formler", () => {
    expect(csvCell("Jönköping; län")).toBe('"Jönköping; län"');
    expect(csvCell('Säg "hej"')).toBe('"Säg ""hej"""');
    expect(csvCell("=SUMMA(A1)")).toBe("'=SUMMA(A1)");
    expect(csvCell("..")).toBe("..");
  });
});

describe("SVG-exporten", () => {
  const mat = (s: string, font: string) => s.length * (font.includes("18px") ? 9 : 7);
  const diagram = { markup: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"></svg>', bredd: 400, hojd: 200 };

  it("radbryter inom bredden och aldrig vid hårt mellanslag", () => {
    expect(radbryt("ett två tre fyra", 7, (s) => s.length)).toEqual(["ett två", "tre", "fyra"]);
    expect(radbryt("87,7 % och mer", 4, (s) => s.length)).toEqual(["87,7 %", "och", "mer"]);
  });

  it("bakar in kicker, titel, undertitel, not, källa och typsnitt", () => {
    const text = exportText({ ...exempel(), kicker: "Telefonsamtal besvarade samma dag" });
    const { svg, bredd, hojd } = byggExportSvg(text, diagram, mat, "@font-face{font-family:x}");
    expect(bredd).toBe(400 + 2 * tema.diagram.platta.luft);
    expect(svg).toContain("Telefonsamtal besvarade samma dag");
    expect(svg).toContain(">Halland jämfört med övriga regioner<");
    expect(svg).toContain("Andel samtal besvarade samma dag");
    expect(svg).toContain("Not: Från 2024 mäts tillgängligheten på ett nytt sätt.");
    expect(svg).toContain("Källa: Väntetider i vården, SKR");
    expect(svg).toContain("<style>@font-face{font-family:x}</style>");
    expect(svg).toContain(`fill="${tema.farg.yta}"`);
    expect(svg).toContain("<desc>Linjediagram som visar");
    expect(svgStorlek(svg)).toEqual({ bredd, hojd });
    // Diagrammet och texterna ryms i höjden.
    expect(hojd).toBeGreaterThan(200 + 2 * tema.diagram.platta.luft + tema.rum[5]);
  });

  it("blir högre när undertiteln bryts på fler rader", () => {
    const text = exportText(exempel());
    const bred = byggExportSvg(text, { ...diagram, bredd: 900 }, mat).hojd;
    const smal = byggExportSvg(text, { ...diagram, bredd: 300 }, mat).hojd;
    expect(smal).toBeGreaterThan(bred);
  });

  it("utelämnar not och källa som saknas och skyddar specialtecken", () => {
    const text = exportText(exempel({ noter: [], kalla: undefined, titel: "A & B <C>" }));
    expect(text.noter).toEqual([]);
    const { svg } = byggExportSvg(text, diagram, mat);
    expect(svg).not.toContain("Källa:");
    expect(svg).toContain("A &amp; B &lt;C&gt;");
  });
});
