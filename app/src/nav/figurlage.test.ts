// Tester för figurernas läge i adressen (WP10): registret, länken till blocket
// ("Kopiera länk") och läspositionen som tar med blockets läge.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { anmalFigurlage, figurlage, lankTillBlock } from "./figurlage";
import { format, parse, type Route } from "./route";
import { LASPOSITION_FORDROJNING, skapaRouter, type Plats } from "./useRoute";

const KAP = "#/kapitel/akutflode?vy=manad";
const kapitel = (extra: Partial<Extract<Route, { sida: "kapitel" }>> = {}): Route => ({ sida: "kapitel", id: "akutflode", vy: "manad", ...extra });

afterEach(() => {
  for (const id of ["vantetid", "belaggning", "akutbesok"]) anmalFigurlage(id, null);
});

describe("registret", () => {
  it("figuren anmäler sitt läge och tar bort det", () => {
    expect(figurlage("vantetid")).toBeUndefined();
    anmalFigurlage("vantetid", { v: "enheter", e: "halmstad" });
    expect(figurlage("vantetid")).toEqual({ v: "enheter", e: "halmstad" });
    anmalFigurlage("vantetid", {});
    expect(figurlage("vantetid")).toEqual({});
    anmalFigurlage("vantetid", null);
    expect(figurlage("vantetid")).toBeUndefined();
    expect(figurlage(undefined)).toBeUndefined();
  });
});

describe("Kopiera länk: adressen till blocket läsaren står vid", () => {
  it("tar med figurens visning och fokusenhet", () => {
    anmalFigurlage("vantetid", { v: "enheter", e: "halmstad" });
    const till = lankTillBlock(kapitel({ i: "belaggning", red: true }), "vantetid");
    expect(format(till)).toBe(`${KAP}&i=vantetid&v=enheter&e=halmstad&red=1`);
    // Och länken öppnar samma läge
    expect(parse(format(till))).toMatchObject({ i: "vantetid", v: "enheter", e: "halmstad" });
  });

  it("en figur i förval och block utan figur ger bara i", () => {
    anmalFigurlage("belaggning", {});
    expect(format(lankTillBlock(kapitel({ i: "vantetid", v: "enheter", e: "halmstad" }), "belaggning"))).toBe(`${KAP}&i=belaggning`);
    expect(format(lankTillBlock(kapitel(), "det-viktigaste"))).toBe(`${KAP}&i=det-viktigaste`);
  });

  it("adressens eget läge gäller när figuren ännu inte anmält sig", () => {
    expect(format(lankTillBlock(kapitel({ i: "vantetid", v: "enheter", e: "halmstad" }), "vantetid")))
      .toBe(`${KAP}&i=vantetid&v=enheter&e=halmstad`);
  });

  it("överst i kapitlet och andra sidor", () => {
    anmalFigurlage("vantetid", { e: "halmstad" });
    expect(format(lankTillBlock(kapitel({ i: "vantetid" }), ""))).toBe(KAP);
    expect(lankTillBlock({ sida: "sammanfattning", vy: "ar" }, "vantetid")).toEqual({ sida: "sammanfattning", vy: "ar" });
  });
});

describe("läspositionen tar med blockets figurläge", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function plats(start: string) {
    const poster = [start];
    const p: Plats = {
      hash: () => poster[0],
      push: (h) => { poster[0] = h; },
      ersatt: (h) => { poster[0] = h; },
      lyssna: () => {},
    };
    return { p, poster };
  }

  it("läsaren rullar till en borrad figur: adressen får dess v och e, och tappar dem igen efter", () => {
    const { p, poster } = plats(`${KAP}&i=belaggning`);
    const r = skapaRouter(p);
    r.prenumerera(() => {});
    anmalFigurlage("vantetid", { v: "enheter", e: "halmstad" });
    r.uppdateraLasposition("vantetid");
    vi.advanceTimersByTime(LASPOSITION_FORDROJNING);
    expect(poster[0]).toBe(`${KAP}&i=vantetid&v=enheter&e=halmstad`);
    r.uppdateraLasposition("akutbesok");
    vi.advanceTimersByTime(LASPOSITION_FORDROJNING);
    expect(poster[0]).toBe(`${KAP}&i=akutbesok`);
  });

  it("figuren skriver sitt läge med replaceState när läsaren borrar ned, utan ny historikpost", () => {
    const { p, poster } = plats(`${KAP}&i=vantetid`);
    const r = skapaRouter(p);
    r.prenumerera(() => {});
    r.navigera(kapitel({ i: "vantetid", v: "enheter", e: "halmstad" }), { ersatt: true, rulla: false, fokus: false });
    expect(poster).toEqual([`${KAP}&i=vantetid&v=enheter&e=halmstad`]);
    expect(r.tillstand()).toMatchObject({ kalla: "navigering", rulla: false, fokus: false });
  });
});
