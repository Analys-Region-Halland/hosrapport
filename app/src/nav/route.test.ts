import { describe, expect, it } from "vitest";
import {
  format, gammaltAnkare, KAPITELBLOCK, lika, parse, sammaSida, skrivOmGammalt, START, STANDARDVY,
  type AnkarKontext, type Route,
} from "./route";

// Alla adresser i arkitektur.md 4.6, i kanonisk form.
const ADRESSER: [string, Route][] = [
  ["#/", { sida: "start" }],
  ["#/sammanfattning?vy=ar", { sida: "sammanfattning", vy: "ar" }],
  ["#/sammanfattning?vy=manad", { sida: "sammanfattning", vy: "manad" }],
  ["#/kapitel/skr-tillganglighet?vy=ar", { sida: "kapitel", id: "skr-tillganglighet", vy: "ar" }],
  ["#/kapitel/akutflode?vy=manad&i=vantetid", { sida: "kapitel", id: "akutflode", vy: "manad", i: "vantetid" }],
  [
    "#/kapitel/akutflode?vy=manad&i=vantetid&v=enheter&e=halmstad",
    { sida: "kapitel", id: "akutflode", vy: "manad", i: "vantetid", v: "enheter", e: "halmstad" },
  ],
  [
    "#/kapitel/skr-tillganglighet?vy=ar&i=kolada-n79179&v=rang&red=1",
    { sida: "kapitel", id: "skr-tillganglighet", vy: "ar", i: "kolada-n79179", v: "rang", red: true },
  ],
  ["#/kapitel/akutflode?vy=dag&red=1", { sida: "kapitel", id: "akutflode", vy: "dag", red: true }],
  ["#/begrepp", { sida: "begrepp" }],
  ["#/begrepp/forvantat-intervall", { sida: "begrepp", id: "forvantat-intervall" }],
  ["#/las", { sida: "las" }],
];

describe("parse och format", () => {
  it.each(ADRESSER)("%s", (hash, route) => {
    expect(parse(hash)).toEqual(route);
    expect(format(route)).toBe(hash);
  });

  it("alla vyer går fram och tillbaka", () => {
    for (const vy of ["dag", "vecka", "manad", "kvartal", "ar"] as const) {
      const r: Route = { sida: "kapitel", id: "akutflode", vy, i: "ambulans" };
      expect(parse(format(r))).toEqual(r);
    }
  });

  it("hash utan # och med blanksteg runt tolkas likadant", () => {
    expect(parse("/kapitel/akutflode?vy=vecka")).toEqual({ sida: "kapitel", id: "akutflode", vy: "vecka" });
    expect(parse("  #/las ")).toEqual({ sida: "las" });
  });

  it("id med å, ä, ö, blanksteg och reserverade tecken kodas och avkodas", () => {
    const r: Route = { sida: "kapitel", id: "kapitel å/ä", vy: "ar", i: "block&x=1", e: "Halmstad sjukhus" };
    const h = format(r);
    expect(h).toBe("#/kapitel/kapitel%20%C3%A5%2F%C3%A4?vy=ar&i=block%26x%3D1&e=Halmstad%20sjukhus");
    expect(parse(h)).toEqual(r);
    expect(parse(format({ sida: "begrepp", id: "förväntat intervall" }))).toEqual({ sida: "begrepp", id: "förväntat intervall" });
  });

  it("parametrarna skrivs i fast ordning oavsett ordningen i adressen", () => {
    expect(format(parse("#/kapitel/akutflode?red=1&e=x&i=b&vy=vecka&v=tid")))
      .toBe("#/kapitel/akutflode?vy=vecka&i=b&v=tid&e=x&red=1");
  });

  it("avslutande snedstreck och dubbla snedstreck godtas", () => {
    expect(parse("#/kapitel/akutflode/?vy=manad")).toEqual({ sida: "kapitel", id: "akutflode", vy: "manad" });
    expect(parse("#//las")).toEqual({ sida: "las" });
    expect(parse("#/begrepp/")).toEqual({ sida: "begrepp" });
  });
});

describe("saknade och ogiltiga parametrar", () => {
  it("saknad vy blir standardvyn", () => {
    expect(STANDARDVY).toBe("ar");
    expect(parse("#/kapitel/akutflode")).toEqual({ sida: "kapitel", id: "akutflode", vy: "ar" });
    expect(parse("#/sammanfattning")).toEqual({ sida: "sammanfattning", vy: "ar" });
  });

  it("okänd vy blir standardvyn, okänd visning och red≠1 faller bort", () => {
    expect(parse("#/kapitel/akutflode?vy=timme&v=paj&red=0")).toEqual({ sida: "kapitel", id: "akutflode", vy: "ar" });
    expect(parse("#/kapitel/akutflode?red=true")).toEqual({ sida: "kapitel", id: "akutflode", vy: "ar" });
    expect(parse("#/sammanfattning?vy=AR")).toEqual({ sida: "sammanfattning", vy: "ar" });
  });

  it("tomma i och e faller bort", () => {
    expect(parse("#/kapitel/akutflode?vy=manad&i=&e=")).toEqual({ sida: "kapitel", id: "akutflode", vy: "manad" });
  });

  it("parametrar på sidor som inte har några ignoreras", () => {
    expect(parse("#/begrepp?vy=manad")).toEqual({ sida: "begrepp" });
    expect(parse("#/las?i=x")).toEqual({ sida: "las" });
    expect(parse("#/?vy=manad")).toEqual(START);
  });
});

describe("felaktiga adresser blir startsidan", () => {
  it.each([
    "",
    "#",
    "#/okand",
    "#/Kapitel/akutflode",
    "#kapitel/akutflode",
    "#/kapitel",
    "#/kapitel/a/b",
    "#/sammanfattning/x",
    "#/begrepp/a/b",
    "#/las/mer",
    "#/kapitel/%E0%A4%A",
    "#/kapitel/%",
    "#rapport-",
    "#foo",
  ])("%s", (hash) => {
    expect(parse(hash)).toEqual(START);
  });

  it("startsidan skrivs som #/", () => {
    expect(format(parse("#/okand"))).toBe("#/");
  });
});

describe("gamla ankare (#rapport-{x})", () => {
  const kapitel: Record<string, string> = {
    "skr-tillganglighet": "skr-tillganglighet",
    "kolada-n79179": "skr-tillganglighet",
    "tillg-cancer": "skr-tillganglighet",
    akutflode: "akutflode",
    vantetid: "akutflode",
  };
  const uppslag: AnkarKontext["kapitelFor"] = (id) => kapitel[id];

  it("känner igen ankaret och avkodar id:t", () => {
    expect(gammaltAnkare("#rapport-kolada-n79179")).toBe("kolada-n79179");
    expect(gammaltAnkare("rapport-tillg-cancer")).toBe("tillg-cancer");
    expect(gammaltAnkare("#rapport-v%C3%A5rd")).toBe("vård");
    expect(gammaltAnkare("#/kapitel/x")).toBeNull();
    expect(gammaltAnkare("#rapport-")).toBeNull();
    expect(gammaltAnkare("#rapport-%")).toBeNull();
  });

  it("indikator och avsnitt skrivs om till sitt kapitel med i", () => {
    expect(parse("#rapport-kolada-n79179", { kapitelFor: uppslag }))
      .toEqual({ sida: "kapitel", id: "skr-tillganglighet", vy: "ar", i: "kolada-n79179" });
    expect(format(parse("#rapport-tillg-cancer", { kapitelFor: uppslag })))
      .toBe("#/kapitel/skr-tillganglighet?vy=ar&i=tillg-cancer");
  });

  it("kapitlets eget id ger kapitlet utan i", () => {
    expect(parse("#rapport-akutflode", { kapitelFor: uppslag })).toEqual({ sida: "kapitel", id: "akutflode", vy: "ar" });
  });

  it("vyn följer med från den adress läsaren står på", () => {
    const aktuell: Route = { sida: "kapitel", id: "akutflode", vy: "manad", i: "belaggning" };
    expect(parse("#rapport-vantetid", { aktuell, kapitelFor: uppslag }))
      .toEqual({ sida: "kapitel", id: "akutflode", vy: "manad", i: "vantetid" });
  });

  it("utan uppslag gäller ankaret kapitlet läsaren står i, och redigeringsläget behålls", () => {
    const aktuell: Route = { sida: "kapitel", id: "akutflode", vy: "vecka", i: "x", v: "rang", e: "y", red: true };
    expect(parse("#rapport-ambulans", { aktuell }))
      .toEqual({ sida: "kapitel", id: "akutflode", vy: "vecka", i: "ambulans", red: true });
  });

  it("redigeringsläget följer inte med till ett annat kapitel", () => {
    const aktuell: Route = { sida: "kapitel", id: "akutflode", vy: "ar", red: true };
    expect(parse("#rapport-kolada-n79179", { aktuell, kapitelFor: uppslag }))
      .toEqual({ sida: "kapitel", id: "skr-tillganglighet", vy: "ar", i: "kolada-n79179" });
  });

  it("gamla blocknamn för översikt och källor får de nya namnen", () => {
    const aktuell: Route = { sida: "kapitel", id: "skr-tillganglighet", vy: "ar" };
    expect(parse("#rapport-oversikt", { aktuell })).toMatchObject({ i: KAPITELBLOCK.laget });
    expect(parse("#rapport-kallor", { aktuell })).toMatchObject({ i: KAPITELBLOCK.om });
  });

  it("helhetsvyns översikt utan kapitel blir sammanfattningen", () => {
    expect(parse("#rapport-oversikt")).toEqual({ sida: "sammanfattning", vy: "ar" });
    expect(parse("#rapport-oversikt", { aktuell: { sida: "sammanfattning", vy: "manad" } }))
      .toEqual({ sida: "sammanfattning", vy: "manad" });
  });

  it("okänt block utan sammanhang kan inte lösas utan data", () => {
    expect(skrivOmGammalt("kolada-n79179")).toBeNull();
    expect(skrivOmGammalt("okand", { kapitelFor: uppslag })).toBeNull();
    expect(parse("#rapport-kolada-n79179")).toEqual(START);
    expect(parse("#rapport-kolada-n79179", { aktuell: { sida: "begrepp" } })).toEqual(START);
  });
});

describe("jämförelser", () => {
  it("lika jämför kanonisk form", () => {
    expect(lika(parse("#/kapitel/akutflode"), { sida: "kapitel", id: "akutflode", vy: "ar" })).toBe(true);
    expect(lika({ sida: "begrepp" }, { sida: "begrepp", id: "x" })).toBe(false);
  });

  it("sammaSida bortser från läsposition, figurläge och redigeringsläge", () => {
    const a: Route = { sida: "kapitel", id: "akutflode", vy: "manad" };
    expect(sammaSida(a, { ...a, i: "x", v: "tid", e: "y", red: true })).toBe(true);
    expect(sammaSida(a, { ...a, vy: "vecka" })).toBe(false);
    expect(sammaSida(a, { ...a, id: "skr-kostnader" })).toBe(false);
    expect(sammaSida({ sida: "las" }, { sida: "las" })).toBe(true);
    expect(sammaSida({ sida: "begrepp" }, { sida: "begrepp", id: "x" })).toBe(false);
    expect(sammaSida({ sida: "start" }, { sida: "las" })).toBe(false);
  });
});
