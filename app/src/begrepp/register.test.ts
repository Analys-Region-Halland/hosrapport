// Tester för innehållet i innehall/begrepp.json (stilguiden 3.1 och 5.7,
// arkitektur.md WP5): längder, em dash, unika id och termer, se även, granskning
// och att varje form faktiskt länkas till sitt eget begrepp.
import { describe, expect, it } from "vitest";
import raw from "../../../innehall/begrepp.json";
import { lankaBegrepp } from "./lanka";
import { alfabetisk, BEGREPP, hittaBegrepp, KATEGORIER, tolkaRegister } from "./register";

const ord = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const meningar = (s: string) => s.split(/(?<=[.!?])\s+/).filter(Boolean);
const former = (id: string) => {
  const b = hittaBegrepp(BEGREPP, id)!;
  return [b.term, ...b.former];
};

// Startlistan i arkitektur.md WP5.
const STARTLISTA = [
  "ai-analys", "forvantat-intervall", "i-fas", "bevaka", "avvikelse", "topp-3", "plats-bland-regionerna",
  "rikssnitt", "procentenhet", "median", "seriebrott", "aggregat-och-enheter", "vardgaranti",
  "tillganglighetsgaranti", "svf", "drg", "kpp", "strukturjusterad-kostnad", "behovsjusterad-jamforelse",
  "belaggningsgrad", "medianvantetid", "kolada", "varden-i-siffror", "kvalitetsregister", "beskrivande-matt",
];

describe("begrepp.json: form", () => {
  it("läses av tolkaRegister och har minst startlistans begrepp", () => {
    expect(tolkaRegister(raw)).toEqual(BEGREPP);
    for (const id of STARTLISTA) expect(hittaBegrepp(BEGREPP, id), id).toBeDefined();
  });

  it("har fältet granskad på varje post", () => {
    for (const p of raw as Record<string, unknown>[]) expect(typeof p.granskad, String(p.id)).toBe("boolean");
  });

  it("har id som slug och kategorier ur listan", () => {
    for (const b of BEGREPP) {
      expect(b.id, b.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(KATEGORIER).toContain(b.kategori);
    }
  });

  it("stoppar poster med fel form", () => {
    const ok = { id: "x", term: "X", former: [], kort: "Kort.", kategori: "metod", granskad: false };
    expect(() => tolkaRegister([ok])).not.toThrow();
    const { granskad: _g, ...utanGranskad } = ok;
    expect(() => tolkaRegister([utanGranskad])).toThrow(/granskad/);
    expect(() => tolkaRegister([{ ...ok, kategori: "annat" }])).toThrow(/kategori/);
    expect(() => tolkaRegister([{ ...ok, kalla: { url: "https://x.se" } }])).toThrow(/kalla/);
    expect(() => tolkaRegister({})).toThrow();
  });
});

describe("begrepp.json: skrivregler (stilguiden 3.1 och 5.7)", () => {
  it("har kort förklaring på högst 25 ord", () => {
    for (const b of BEGREPP) expect(ord(b.kort), b.id).toBeLessThanOrEqual(25);
  });

  it("har lång förklaring på högst 80 ord", () => {
    for (const b of BEGREPP) if (b.lang) expect(ord(b.lang), b.id).toBeLessThanOrEqual(80);
  });

  it("har meningar på högst 25 ord", () => {
    for (const b of BEGREPP) {
      for (const m of [...meningar(b.kort), ...meningar(b.lang ?? "")]) expect(ord(m), `${b.id}: ${m}`).toBeLessThanOrEqual(25);
    }
  });

  it("innehåller inga em dash", () => {
    expect(JSON.stringify(raw)).not.toContain("—");
  });

  it("börjar den korta förklaringen med vad det är, inte med termen", () => {
    for (const b of BEGREPP) {
      const borjan = b.kort.toLocaleLowerCase("sv");
      for (const f of former(b.id)) {
        const fl = f.toLocaleLowerCase("sv");
        const traff = borjan.startsWith(fl) && !/[\p{L}\p{N}]/u.test(borjan.charAt(fl.length));
        expect(traff, `${b.id} börjar med "${f}"`).toBe(false);
      }
    }
  });

  it("förklarar att AI-analysen genereras med regler ur rapportens data", () => {
    const ai = hittaBegrepp(BEGREPP, "ai-analys")!;
    expect(ai.kort).toMatch(/regler/);
    expect(ai.kort).toMatch(/rapportens data/);
  });

  it("har källor med namn och https-adress", () => {
    for (const b of BEGREPP) {
      if (!b.kalla) continue;
      expect(b.kalla.namn.length, b.id).toBeGreaterThan(0);
      if (b.kalla.url) expect(b.kalla.url, b.id).toMatch(/^https:\/\//);
    }
  });
});

describe("begrepp.json: unikhet och hänvisningar", () => {
  it("har unika id och termer", () => {
    const ids = BEGREPP.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    const termer = BEGREPP.map((b) => b.term.toLocaleLowerCase("sv"));
    expect(new Set(termer).size).toBe(termer.length);
  });

  it("låter ingen form höra till två begrepp", () => {
    const agare = new Map<string, string>();
    for (const b of BEGREPP) {
      for (const f of former(b.id)) {
        const nyckel = f.toLocaleLowerCase("sv");
        const forre = agare.get(nyckel);
        expect(forre === undefined || forre === b.id, `"${f}" finns i både ${forre} och ${b.id}`).toBe(true);
        agare.set(nyckel, b.id);
      }
    }
  });

  it("låter se_aven peka på befintliga id, inte på sig själv", () => {
    const ids = new Set(BEGREPP.map((b) => b.id));
    for (const b of BEGREPP) {
      for (const s of b.se_aven ?? []) {
        expect(ids.has(s), `${b.id} → ${s}`).toBe(true);
        expect(s, b.id).not.toBe(b.id);
      }
    }
  });

  it("länkar varje form till sitt eget begrepp", () => {
    for (const b of BEGREPP) {
      for (const f of former(b.id)) {
        const delar = lankaBegrepp(`Text om ${f} här.`, BEGREPP, new Set());
        const lankar = delar.filter((d) => typeof d !== "string");
        expect(lankar, `${b.id}: "${f}"`).toEqual([{ id: b.id, text: f }]);
      }
    }
  });

  it("länkar inte ordet riket, som används i sin vanliga betydelse", () => {
    const delar = lankaBegrepp("Sett till riket står sig regionen bättre.", BEGREPP, new Set());
    expect(delar).toEqual(["Sett till riket står sig regionen bättre."]);
  });
});

describe("alfabetisk", () => {
  it("sorterar efter svensk ordning med Å, Ä och Ö sist", () => {
    const termer = alfabetisk(BEGREPP).map((b) => b.term);
    expect(termer[0]).toBe("Aggregat och enheter");
    expect(termer[termer.length - 1]).toBe("Åldersstandardisering");
    expect(termer).toEqual([...termer].sort((a, b) => a.localeCompare(b, "sv")));
  });
});
