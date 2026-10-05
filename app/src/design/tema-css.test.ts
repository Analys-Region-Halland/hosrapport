import { describe, expect, it } from "vitest";
import { tema } from "./tema";
import { temaCss, temaVariabler, temaVariablerMobil } from "./tema-css";

describe("tema-css", () => {
  const v = temaVariabler();

  it("namnger variablerna som tokenvägen med bindestreck", () => {
    expect(v["--farg-diagram-fokus"]).toBe(tema.farg.diagram.fokus);
    expect(v["--farg-papper"]).toBe(tema.farg.papper);
    expect(v["--farg-fokusLjus"]).toBe(tema.farg.fokusLjus);
    expect(v["--farg-status-gul-markor"]).toBe(tema.farg.status.gul.markor);
    expect(v["--farg-diagram-markering-0"]).toBe(tema.farg.diagram.markering[0]);
    expect(v["--farg-diagram-markering-3"]).toBe(tema.farg.diagram.markering[3]);
    expect(v["--rum-5"]).toBe("24px");
    expect(v["--rum-10"]).toBe("128px");
  });

  it("typroller blir storlek, radhöjd, vikt och familj utan ordet roll", () => {
    expect(v["--typ-brod-storlek"]).toBe("18px");
    expect(v["--typ-brod-radhojd"]).toBe("1.6");
    expect(v["--typ-brod-vikt"]).toBe("400");
    expect(v["--typ-brod-familj"]).toBe("var(--typ-familj-serif)");
    expect(v["--typ-titel-sparr"]).toBe("-0.02em");
    expect(v["--typ-not-viktStark"]).toBe("600");
    expect(v["--typ-familj-sans"]).toBe(tema.typ.familj.sans);
    expect(Object.keys(v).some((k) => k.includes("roll") || k.includes("mobilstorlek"))).toBe(false);
  });

  it("mått, rörelse och responsiva värden", () => {
    expect(v["--matt-text"]).toBe("34em");
    expect(v["--matt-figur"]).toBe("880px");
    expect(v["--matt-marginal"]).toBe("24px");
    expect(v["--rorelse-kort"]).toBe("120ms");
    const m = temaVariablerMobil();
    expect(m["--typ-titel-storlek"]).toBe("32px");
    expect(m["--matt-marginal"]).toBe("16px");
    expect(m["--typ-not-storlek"]).toBeUndefined(); // samma storlek på mobil
  });

  it("diagramgruppen blir inga CSS-variabler", () => {
    expect(Object.keys(v).some((k) => k.startsWith("--diagram-"))).toBe(false);
  });

  it("allt ligger i @layer tema, med mobil och minskad rörelse", () => {
    const css = temaCss();
    expect(css.trimStart().startsWith("/*")).toBe(true);
    expect(css).toContain("@layer tema {");
    expect(css).toContain(`@media (max-width: ${tema.brytpunkt.mobil.max}px)`);
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("--rorelse-kort: 0ms;");
    expect(css).not.toMatch(/undefined|null|NaN|\[object/);
    expect(css).not.toContain(String.fromCharCode(0x2014)); // em dash
  });
});
