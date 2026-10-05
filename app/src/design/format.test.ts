import { describe, expect, it } from "vitest";
import {
  antalILoptext, datum, intervall, isoVecka, kronor, minuter, perInvanare, period,
  periodIntervall, plats, procent, procentenheter, tal, varde,
} from "./format";

// Läsbara förväntningar: "_" = hårt mellanslag (U+00A0). Minus (U+2212) och kort
// tankstreck (U+2013) står som tecken.
const NBSP = String.fromCharCode(0x00a0);
const EM_DASH = String.fromCharCode(0x2014);
const h = (s: string) => s.replace(/_/g, NBSP);

describe("tal", () => {
  it("tusental med hårt mellanslag och decimalkomma", () => {
    expect(tal(12345)).toBe(h("12_345"));
    expect(tal(1234567.891, 2)).toBe(h("1_234_567,89"));
    expect(tal(3.4, 1)).toBe("3,4");
    expect(tal(999)).toBe("999");
  });
  it("minus är U+2212 i tabell och bindestreck i löptext", () => {
    expect(tal(-3.2, 1)).toBe("−3,2");
    expect(tal(-3.2, 1, "lopande")).toBe("-3,2");
    expect(tal(-12345, 0)).toBe(h("−12_345"));
  });
  it("avrundning till noll ger inget minustecken", () => {
    expect(tal(-0.04, 1)).toBe("0,0");
    expect(tal(-0)).toBe("0");
  });
  it("samma antal decimaler även för heltal", () => {
    expect(tal(87, 1)).toBe("87,0");
  });
  it("saknade och ogiltiga tal blir tankstreck", () => {
    expect(tal(Number.NaN)).toBe("–");
  });
});

describe("enheter", () => {
  it("procent med hårt mellanslag före %", () => {
    expect(procent(87.66)).toBe(h("87,7_%"));
    expect(procent(-1.25, 1)).toBe(h("−1,3_%"));
  });
  it("procentenheter: p.e. i tabell, utskrivet i löptext", () => {
    expect(procentenheter(2.1)).toBe(h("2,1_p.e."));
    expect(procentenheter(2.1, 1, "lopande")).toBe(h("2,1_procentenheter"));
  });
  it("kronor", () => {
    expect(kronor(45300)).toBe(h("45_300_kr"));
  });
  it("minuter", () => {
    expect(minuter(42.4)).toBe(h("42_min"));
  });
  it("per invånare: förkortat i etiketter, utskrivet i löptext", () => {
    expect(perInvanare(12.34)).toBe(h("12,3_per_100_000_inv."));
    expect(perInvanare(12.34, 1, "lopande")).toBe(h("12,3_per_100_000_invånare"));
  });
});

describe("varde", () => {
  it("väljer enhet och standarddecimaler ur formatet", () => {
    expect(varde(87.66, { enhet: "procent" })).toBe(h("87,7_%"));
    expect(varde(45300, { enhet: "kronor" })).toBe(h("45_300_kr"));
    expect(varde(1.234, { enhet: "kvot" })).toBe("1,2");
    expect(varde(1234.4, { enhet: "antal" })).toBe(h("1_234"));
    expect(varde(5.56, { enhet: "per_invanare" })).toBe(h("5,6_per_100_000_inv."));
    expect(varde(87.66, { enhet: "procent", decimaler: 0 })).toBe(h("88_%"));
  });
  it("saknas blir – och undertryckt blir ..", () => {
    expect(varde(null, { enhet: "procent" })).toBe("–");
    expect(varde(undefined, { enhet: "antal" })).toBe("–");
    expect(varde(3, { enhet: "antal" }, "tabell", true)).toBe("..");
  });
});

describe("text", () => {
  it("intervall med kort tankstreck utan mellanslag", () => {
    expect(intervall(2016, 2025)).toBe("2016–2025");
    expect(intervall("plats 4", 7)).toBe("plats 4–7");
  });
  it("plats av antal", () => {
    expect(plats(8, 21)).toBe(h("plats_8 av_21"));
  });
  it("ett till tolv med bokstäver i löptext", () => {
    expect(antalILoptext(3)).toBe("tre");
    expect(antalILoptext(12)).toBe("tolv");
    expect(antalILoptext(14)).toBe("14");
    expect(antalILoptext(0)).toBe("0");
  });
  it("inga em dash i någon formaterad text", () => {
    const allt = [
      tal(-1), procent(1), procentenheter(1), kronor(1), perInvanare(1), intervall(1, 2),
      period("2026-03-01", "manad", "lopande"), periodIntervall("2021-01-01", "2026-03-01", "manad"),
    ].join(" ");
    expect(allt).not.toContain(EM_DASH);
  });
});

describe("datum och perioder", () => {
  it("datum i löptext och kort", () => {
    expect(datum("2026-10-05")).toBe("5 oktober 2026");
    expect(datum("2026-10-05", true)).toBe("5 okt 2026");
  });
  it("ISO-veckor över årsskiften", () => {
    expect(isoVecka("2020-12-28")).toEqual({ vecka: 53, ar: 2020 });
    expect(isoVecka("2021-01-04")).toEqual({ vecka: 1, ar: 2021 });
    expect(isoVecka("2026-03-23")).toEqual({ vecka: 13, ar: 2026 });
    expect(isoVecka("2024-12-30")).toEqual({ vecka: 1, ar: 2025 });
  });
  it("år", () => {
    expect(period("2025-01-01", "ar")).toBe("2025");
    expect(period("2025-01-01", "ar", "lopande")).toBe("2025");
  });
  it("månad: förkortad på axel, utskriven i löptext", () => {
    expect(period("2026-03-01", "manad")).toBe("mar 26");
    expect(period("2026-03-01", "manad", "kort")).toBe("mar 2026");
    expect(period("2026-03-01", "manad", "lopande")).toBe("mars 2026");
  });
  it("vecka: v. 12 på axel, vecka 12 i löptext", () => {
    expect(period("2026-03-16", "vecka")).toBe(h("v._12"));
    expect(period("2026-03-16", "vecka", "kort")).toBe(h("v._12 2026"));
    expect(period("2026-03-16", "vecka", "lopande")).toBe("vecka 12");
  });
  it("dag", () => {
    expect(period("2026-03-01", "dag")).toBe("1 mar");
    expect(period("2026-03-01", "dag", "kort")).toBe("1 mar 2026");
    expect(period("2026-03-01", "dag", "lopande")).toBe("1 mars 2026");
  });
  it("kvartal", () => {
    expect(period("2026-04-01", "kvartal")).toBe(h("kv._2 26"));
    expect(period("2026-04-01", "kvartal", "kort")).toBe(h("kv._2 2026"));
    expect(period("2026-04-01", "kvartal", "lopande")).toBe("kvartal 2 2026");
  });
  it("periodintervall", () => {
    expect(periodIntervall("2016-01-01", "2025-01-01", "ar")).toBe("2016–2025");
    expect(periodIntervall("2021-01-01", "2026-03-01", "manad")).toBe("jan 2021–mar 2026");
    expect(periodIntervall("2025-01-01", "2025-01-01", "ar")).toBe("2025");
  });
});
