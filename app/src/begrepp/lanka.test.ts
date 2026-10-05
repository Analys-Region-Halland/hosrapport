// Tester för länkningen av begrepp (docs/arkitektur.md 4.5, stilguiden 5.7).
import { describe, expect, it } from "vitest";
import { lankaBegrepp, lankaStycken, slappAnsprak, utanMarkering, type Del } from "./lanka";
import type { Begrepp } from "./register";

const b = (id: string, term: string, former: string[] = [], undantag?: string[]): Begrepp => ({
  id, term, former, kort: "Kort förklaring.", kategori: "statistik", ...(undantag ? { undantag } : {}),
});

const REG: Begrepp[] = [
  b("rikssnitt", "Rikssnitt", ["rikssnittet", "riksgenomsnitt"]),
  b("median", "Median", ["medianen"]),
  b("medianvantetid", "Medianväntetid", ["medianväntetiden"]),
  b("belaggningsgrad", "Beläggningsgrad", ["beläggningsgraden", "beläggning", "beläggningen"]),
  b("kvalitetsregister", "Nationellt kvalitetsregister", ["nationella kvalitetsregister", "kvalitetsregister"]),
  b("avvikelse", "Avvikelse", [], ["avvikelse mot"]),
  b("topp-3", "Topp 3", ["de tre främsta"]),
  b("varden-i-siffror", "Vården i siffror"),
  b("aldersstandardisering", "Åldersstandardisering", ["åldersstandardiserade"]),
  b("kpp", "KPP"),
  b("vardgaranti", "Vårdgaranti", ["vårdgarantin"]),
  b("i-fas", "I fas"),
];

const lanka = (text: string, redan = new Set<string>()) => lankaBegrepp(text, REG, redan);
const lankar = (delar: Del[]) => delar.filter((d): d is { id: string; text: string } => typeof d !== "string");
const text = (delar: Del[]) => delar.map((d) => (typeof d === "string" ? d : d.text)).join("");

describe("lankaBegrepp: grundfall", () => {
  it("lämnar text utan begrepp orörd", () => {
    expect(lanka("Halland ligger stabilt.")).toEqual(["Halland ligger stabilt."]);
    expect(lanka("")).toEqual([]);
  });

  it("länkar termen och behåller resten av texten", () => {
    const d = lanka("Regionen ligger över rikssnittet i år.");
    expect(d).toEqual(["Regionen ligger över ", { id: "rikssnitt", text: "rikssnittet" }, " i år."]);
  });

  it("ger aldrig tomma eller intilliggande textbitar", () => {
    const d = lanka("Rikssnittet, medianen och KPP.");
    for (let i = 0; i < d.length; i++) {
      if (typeof d[i] === "string") {
        expect(d[i]).not.toBe("");
        expect(typeof d[i + 1]).not.toBe("string");
      }
    }
    expect(text(d)).toBe("Rikssnittet, medianen och KPP.");
  });
});

describe("lankaBegrepp: böjningsformer och skiftläge", () => {
  it("länkar former och synonymer till samma begrepp", () => {
    expect(lankar(lanka("Riksgenomsnitt"))).toEqual([{ id: "rikssnitt", text: "Riksgenomsnitt" }]);
    expect(lankar(lanka("över rikssnittet"))).toEqual([{ id: "rikssnitt", text: "rikssnittet" }]);
    expect(lankar(lanka("Beläggningen steg"))).toEqual([{ id: "belaggningsgrad", text: "Beläggningen" }]);
  });

  it("är skiftlägesokänslig och behåller textens skiftläge", () => {
    expect(lankar(lanka("RIKSSNITTET"))).toEqual([{ id: "rikssnitt", text: "RIKSSNITTET" }]);
    expect(lankar(lanka("ligger i fas"))).toEqual([{ id: "i-fas", text: "i fas" }]);
    expect(lankar(lanka("Status I fas"))).toEqual([{ id: "i-fas", text: "I fas" }]);
  });

  it("klarar å, ä och ö i alla skiftlägen", () => {
    expect(lankar(lanka("ÅLDERSSTANDARDISERADE tal"))).toEqual([{ id: "aldersstandardisering", text: "ÅLDERSSTANDARDISERADE" }]);
    expect(lankar(lanka("åldersstandardiserade tal"))).toEqual([{ id: "aldersstandardisering", text: "åldersstandardiserade" }]);
    expect(lankar(lanka("BELÄGGNINGSGRADEN"))).toEqual([{ id: "belaggningsgrad", text: "BELÄGGNINGSGRADEN" }]);
    expect(lankar(lanka("Vårdgarantin gäller"))).toEqual([{ id: "vardgaranti", text: "Vårdgarantin" }]);
  });
});

describe("lankaBegrepp: ordgränser", () => {
  it("länkar aldrig inne i ord", () => {
    expect(lankar(lanka("överbeläggning och överbeläggningen"))).toEqual([]);
    expect(lankar(lanka("rikssnittsvärdet"))).toEqual([]);
    expect(lankar(lanka("vårdgarantimåtten"))).toEqual([]);
    expect(lankar(lanka("Tvåmedianen"))).toEqual([]);
  });

  it("räknar bindestreck och siffror som en del av ordet", () => {
    expect(lankar(lanka("den KPP-beräknade vården"))).toEqual([]);
    expect(lankar(lanka("bland topp 30"))).toEqual([]);
    expect(lankar(lanka("bland topp 3."))).toEqual([{ id: "topp-3", text: "topp 3" }]);
  });

  it("länkar intill skiljetecken, parenteser och genitiv-kolon", () => {
    expect(lankar(lanka("(rikssnittet)"))).toEqual([{ id: "rikssnitt", text: "rikssnittet" }]);
    expect(lankar(lanka("KPP:s databas"))).toEqual([{ id: "kpp", text: "KPP" }]);
    expect(lankar(lanka("”Medianen”"))).toEqual([{ id: "median", text: "Medianen" }]);
  });

  it("låter mellanrum i en form matcha radbrytning och hårt mellanslag", () => {
    expect(lankar(lanka("via Vården i siffror"))).toEqual([{ id: "varden-i-siffror", text: "Vården i siffror" }]);
    expect(lankar(lanka("via Vården i\nsiffror"))).toEqual([{ id: "varden-i-siffror", text: "Vården i\nsiffror" }]);
  });
});

describe("lankaBegrepp: längsta matchning först", () => {
  it("föredrar det längre begreppet när ett kortare ryms i samma ord", () => {
    expect(lankar(lanka("Medianväntetiden var 182 minuter."))).toEqual([{ id: "medianvantetid", text: "Medianväntetiden" }]);
  });

  it("tar hela flerordsformen före en kortare form av samma begrepp", () => {
    expect(lankar(lanka("i nationella kvalitetsregister"))).toEqual([
      { id: "kvalitetsregister", text: "nationella kvalitetsregister" },
    ]);
  });

  it("länkar båda när de inte överlappar", () => {
    const d = lankar(lanka("Medianen och medianväntetiden"));
    expect(d.map((x) => x.id)).toEqual(["median", "medianvantetid"]);
  });
});

describe("lankaBegrepp: bara första förekomsten per omfång", () => {
  it("länkar bara den första förekomsten i en text", () => {
    const d = lanka("Rikssnittet steg. Halland ligger över rikssnittet.");
    expect(lankar(d)).toEqual([{ id: "rikssnitt", text: "Rikssnittet" }]);
    expect(text(d)).toBe("Rikssnittet steg. Halland ligger över rikssnittet.");
  });

  it("delar omfång mellan anrop via redan och fyller på det", () => {
    const redan = new Set<string>();
    expect(lankar(lanka("Över rikssnittet.", redan))).toHaveLength(1);
    expect(redan.has("rikssnitt")).toBe(true);
    expect(lankar(lanka("Fortfarande över rikssnittet.", redan))).toEqual([]);
    expect(lankar(lanka("Fortfarande över rikssnittet.", new Set()))).toHaveLength(1);
  });

  it("länkar inget som redan finns i omfånget", () => {
    expect(lankar(lanka("rikssnittet och medianen", new Set(["rikssnitt"])))).toEqual([{ id: "median", text: "medianen" }]);
  });

  it("räknar former av samma begrepp som samma förekomst", () => {
    expect(lankar(lanka("Rikssnitt och riksgenomsnitt"))).toEqual([{ id: "rikssnitt", text: "Rikssnitt" }]);
  });
});

describe("lankaBegrepp: undantag", () => {
  it("länkar inte termen inne i en undantagsfras", () => {
    expect(lankar(lanka("Skattesatsen justeras med nettokostnadens avvikelse mot riket."))).toEqual([]);
  });

  it("länkar en senare förekomst utanför undantaget", () => {
    const d = lanka("En avvikelse mot riket. Plats 9 räknas som en avvikelse.");
    expect(d).toEqual(["En avvikelse mot riket. Plats 9 räknas som en ", { id: "avvikelse", text: "avvikelse" }, "."]);
  });

  it("spärrar bara begreppet som äger undantaget", () => {
    expect(lankar(lanka("avvikelse mot rikssnittet"))).toEqual([{ id: "rikssnitt", text: "rikssnittet" }]);
  });
});

describe("lankaBegrepp: explicit markering", () => {
  it("länkar [[id|text]] med den visade texten och tar bort markeringen", () => {
    const d = lanka("Halland ligger över [[rikssnitt|snittet för landet]].");
    expect(d).toEqual(["Halland ligger över ", { id: "rikssnitt", text: "snittet för landet" }, "."]);
  });

  it("visar termen för [[id]] utan text", () => {
    expect(lankar(lanka("Se [[topp-3]]."))).toEqual([{ id: "topp-3", text: "Topp 3" }]);
  });

  it("går före automatiska träffar, även tidigare i texten", () => {
    const d = lanka("Rikssnittet steg. Halland når [[rikssnitt|snittet]].");
    expect(lankar(d)).toEqual([{ id: "rikssnitt", text: "snittet" }]);
    expect(d[0]).toBe("Rikssnittet steg. Halland når ");
  });

  it("länkar explicit text som annars inte hade träffat", () => {
    expect(lankar(lanka("[[vardgaranti|garantin om 90 dagar]]"))).toEqual([{ id: "vardgaranti", text: "garantin om 90 dagar" }]);
  });

  it("gör okända id och redan länkade id till ren text", () => {
    expect(lanka("Ett [[okand|ord]] här.")).toEqual(["Ett ord här."]);
    expect(lanka("[[rikssnitt|snittet]]", new Set(["rikssnitt"]))).toEqual(["snittet"]);
    expect(lankar(lanka("[[rikssnitt|A]] och [[rikssnitt|B]]"))).toEqual([{ id: "rikssnitt", text: "A" }]);
  });

  it("utanMarkering lämnar den visade texten", () => {
    expect(utanMarkering("Se [[rikssnitt|snittet]] och [[topp-3]].", REG)).toBe("Se snittet och Topp 3.");
    expect(utanMarkering("[[topp-3]]")).toBe("topp-3");
    expect(utanMarkering("Ingen markering.")).toBe("Ingen markering.");
  });
});

describe("lankaStycken: delat omfång mellan textblock", () => {
  it("ger samma resultat när ett block länkas om, och spärrar andra blocks begrepp", () => {
    const redan = new Set<string>();
    const a1 = lankaStycken(["Över rikssnittet."], REG, redan, "a");
    const b1 = lankaStycken(["Rikssnittet och medianen."], REG, redan, "b");
    const a2 = lankaStycken(["Över rikssnittet."], REG, redan, "a");
    const b2 = lankaStycken(["Rikssnittet och medianen."], REG, redan, "b");
    expect(lankar(a1[0])).toEqual([{ id: "rikssnitt", text: "rikssnittet" }]);
    expect(lankar(b1[0])).toEqual([{ id: "median", text: "medianen" }]);
    expect(a2).toEqual(a1);
    expect(b2).toEqual(b1);
  });

  it("delar omfång mellan stycken i samma block", () => {
    const d = lankaStycken(["Rikssnittet steg.", "Rikssnittet föll."], REG, new Set(), "a");
    expect(lankar(d[0])).toHaveLength(1);
    expect(lankar(d[1])).toHaveLength(0);
  });

  it("släpper ett blocks anspråk när det tas bort", () => {
    const redan = new Set<string>();
    lankaStycken(["Över rikssnittet."], REG, redan, "a");
    expect(lankar(lankaStycken(["Rikssnittet."], REG, redan, "b")[0])).toEqual([]);
    slappAnsprak(redan, "a");
    expect(redan.has("rikssnitt")).toBe(false);
    expect(lankar(lankaStycken(["Rikssnittet."], REG, redan, "b")[0])).toHaveLength(1);
  });
});
