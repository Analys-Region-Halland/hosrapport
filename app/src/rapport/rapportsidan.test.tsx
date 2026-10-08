// Tester för rapportsidan (WP9): Det viktigaste i sammanfattningen,
// översiktstabellens sortering, texterna i nyckeltalsraden och analysen, och
// att varje uppgift i en indikator står på ett ställe (stilguiden 4.4 och 5.6).
// Komponenterna renderas till HTML utan DOM (react-dom/server); beteende med
// mus och tangentbord prövas i webbläsaren.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { skrUtdrag } from "../data/fixturer";
import type { Huvudpunkt, KapitelModell, KpiModell, VyId } from "../data/modell";
import { normalisera } from "../data/normalisera";
import { HART } from "../design/format";
import { KAPITELBLOCK } from "../nav/route";
import { kapitelPunkter, MAX_VIKTIGAST, nummerFor, valjOverKapitel } from "./huvudpunkter";
import Indikator from "./Indikator";
import KapitelSida from "./KapitelSida";
import { ariaSort, gruppera, nastaSortering, oversiktRader, sorteraRader, STANDARD, type OversiktRad, type Sortering } from "./oversikt";
import { beskrivningUtanTitel, fordjupningTexter } from "./fordjupning";
import { begreppIKapitlet, kapitelMetarad, nyckeltalDelar, utanUpprepning } from "./rapportText";
import Sammanfattning from "./Sammanfattning";

const DATA = fileURLToPath(new URL("../../public/data/", import.meta.url));
const EM_DASH = String.fromCharCode(0x2014);
const filer = readdirSync(DATA).filter((f) => f.endsWith(".json") && f !== "index.json").sort();
const cache = new Map<string, KapitelModell>();
function kapitel(fil: string): KapitelModell {
  let k = cache.get(fil);
  if (!k) {
    k = normalisera(JSON.parse(readFileSync(DATA + fil, "utf8")), fil.split("-")[0] as VyId);
    cache.set(fil, k);
  }
  return k;
}
const vyAv = (fil: string) => fil.split("-")[0] as VyId;
const arsKapitel = () => filer.filter((f) => f.startsWith("ar-")).map(kapitel)
  // Rapportens ordning: SKR-kapitlen 1–6, sedan akutflödet
  .sort((a, b) => Number(a.id === "akutflode") - Number(b.id === "akutflode"));
const kpi = (kap: KapitelModell, id: string) => kap.kpier.find((k) => k.id === id) as KpiModell;

// ════════════════════════════════════════════════════════════
//  Det viktigaste i sammanfattningen
// ════════════════════════════════════════════════════════════

function attrapp(id: string, punkter: Huvudpunkt["ton"][]): KapitelModell {
  return {
    id, namn: id, enheter: [], avsnitt: [], kpier: [], om_statistiken: [], kallor: [], leverans: [],
    huvudpunkter: punkter.map((ton, i) => ({ text: `${id} punkt ${i + 1}.`, kpi_id: `${id}-${i}`, ton })),
  };
}

describe("Det viktigaste över kapitlen", () => {
  it("tar först en punkt per kapitel, sedan nästa omgång, högst sex", () => {
    const k = [attrapp("a", ["negativ", "positiv", "negativ"]), attrapp("b", ["positiv", "negativ"]), attrapp("c", ["neutral"])];
    const v = valjOverKapitel(k);
    expect(v.map((x) => `${x.kapitelId}${x.index}`)).toEqual(["a0", "a1", "a2", "b0", "b1", "c0"]);
    expect(valjOverKapitel(k, 4).map((x) => `${x.kapitelId}${x.index}`)).toEqual(["a0", "a1", "b0", "c0"]);
  });

  it("när en omgång inte ryms går punkter med riktning före neutrala, sedan rapportens ordning", () => {
    const k = ["a", "b", "c", "d", "e", "f", "g"].map((id) => attrapp(id, [id === "b" ? "neutral" : "negativ"]));
    const v = valjOverKapitel(k);
    expect(v).toHaveLength(MAX_VIKTIGAST);
    expect(v.map((x) => x.kapitelId)).toEqual(["a", "c", "d", "e", "f", "g"]);
  });

  it("kapitlets punkter i sammanfattningen är de som inte redan valts", () => {
    const k = [attrapp("a", ["negativ", "positiv", "negativ", "positiv"]), attrapp("b", ["positiv"])];
    const v = valjOverKapitel(k, 2);
    expect(kapitelPunkter(k[0], v).map((p) => p.text)).toEqual(["a punkt 2.", "a punkt 3.", "a punkt 4."]);
    expect(kapitelPunkter(k[0], v, 2)).toHaveLength(2);
    expect(kapitelPunkter(k[1], v)).toEqual([]);
  });

  it("med rapportens data: sex punkter, högst en per kapitel, ingen punkt två gånger på sidan", () => {
    const alla = arsKapitel();
    const v = valjOverKapitel(alla);
    expect(v).toHaveLength(6);
    expect(new Set(v.map((x) => x.kapitelId)).size).toBe(6);
    const texter = [...v.map((x) => x.punkt.text), ...alla.flatMap((k) => kapitelPunkter(k, v, 2).map((p) => p.text))];
    expect(new Set(texter).size).toBe(texter.length);
  });

  it("nummer per indikator följer dispositionen ('se 2.3')", () => {
    const k = kapitel("ar-skr-tillganglighet.json");
    const n = nummerFor(k);
    expect(n.get("kolada-n79179")).toBe("1.1");
    expect(n.get(k.avsnitt[1].kpi_ids[0])).toBe("2.1");
    expect(nummerFor(kapitel("manad-akutflode.json")).get("belaggning")).toBe("1");
  });
});

// ════════════════════════════════════════════════════════════
//  Översiktstabellen
// ════════════════════════════════════════════════════════════

const rad = (kpiId: string, ordning: number, over: Partial<OversiktRad>): OversiktRad => ({
  kpiId, nummer: String(ordning + 1), namn: kpiId, grupp: { id: ordning < 2 ? "g1" : "g2", namn: ordning < 2 ? "Ett" : "Två" },
  ordning, senaste: null, avvikandePeriod: null, plats: null, platsAv: null, status: null, ...over,
});

describe("översiktstabellen", () => {
  const rader = [
    rad("a", 0, { senaste: 50, plats: 8, platsAv: 21, status: "rod" }),
    rad("b", 1, { senaste: 90, plats: 2, platsAv: 21, status: "gron" }),
    rad("c", 2, { senaste: null }),
    rad("d", 3, { senaste: 90, plats: 5, platsAv: 19, status: "gul" }),
  ];
  const ids = (s: Sortering) => sorteraRader(rader, s).map((r) => r.kpiId).join("");

  it("standardordningen grupperas per avsnitt", () => {
    const g = gruppera(rader, STANDARD);
    expect(g.map((x) => [x.grupp?.namn, x.rader.map((r) => r.kpiId).join("")])).toEqual([["Ett", "ab"], ["Två", "cd"]]);
  });

  it("sortering på en kolumn tar bort grupperna; saknade värden sist och lika värden i standardordning", () => {
    expect(ids({ kolumn: "senaste", fallande: true })).toBe("bdac");
    expect(ids({ kolumn: "senaste", fallande: false })).toBe("abdc");
    expect(ids({ kolumn: "plats", fallande: false })).toBe("bdac");
    expect(ids({ kolumn: "status", fallande: true })).toBe("adbc");
    expect(gruppera(rader, { kolumn: "plats", fallande: false })).toHaveLength(1);
    expect(gruppera(rader, { kolumn: "plats", fallande: false })[0].grupp).toBeNull();
  });

  it("första klicket ger högst värde, bästa plats och allvarligaste status; nästa vänder; Indikator återställer", () => {
    expect(nastaSortering(STANDARD, "senaste")).toEqual({ kolumn: "senaste", fallande: true });
    expect(nastaSortering(STANDARD, "plats")).toEqual({ kolumn: "plats", fallande: false });
    expect(nastaSortering(STANDARD, "status")).toEqual({ kolumn: "status", fallande: true });
    expect(nastaSortering({ kolumn: "plats", fallande: false }, "plats")).toEqual({ kolumn: "plats", fallande: true });
    expect(nastaSortering({ kolumn: "plats", fallande: false }, "standard")).toEqual(STANDARD);
    expect(ariaSort({ kolumn: "plats", fallande: false }, "plats")).toBe("ascending");
    expect(ariaSort({ kolumn: "plats", fallande: false }, "senaste")).toBe("none");
    expect(ariaSort(STANDARD, "standard")).toBe("none");
  });

  it("raderna ur ett kapitel: alla indikatorer i dispositionens ordning, period bara när den avviker", () => {
    const k = kapitel("ar-skr-tillganglighet.json");
    const r = oversiktRader(k);
    expect(r.map((x) => x.kpiId)).toEqual(k.avsnitt.flatMap((a) => a.kpi_ids));
    expect(r.find((x) => x.kpiId === "kolada-n79179")).toMatchObject({ plats: 7, platsAv: 19, status: "gul", avvikandePeriod: null });
    expect(r.find((x) => x.kpiId === "kolada-n79173")?.avvikandePeriod).toBe("2024-01-01");
    expect(oversiktRader(kapitel("manad-akutflode.json")).every((x) => x.grupp === null && x.plats === null)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════
//  Texter
// ════════════════════════════════════════════════════════════

describe("nyckeltalsraden, metaraden och analysen", () => {
  it("rankad, beskrivande och intern indikator", () => {
    const tg = kapitel("ar-skr-tillganglighet.json");
    expect(nyckeltalDelar(kpi(tg, "kolada-n79179"), "ar")).toEqual({ varde: `89,8${HART}%`, delar: [`plats${HART}7 av${HART}19`, "2025"] });
    const ko = kapitel("ar-skr-kostnader.json");
    const beskrivande = ko.kpier.find((k) => k.status === null) as KpiModell;
    expect(nyckeltalDelar(beskrivande, "ar").delar[0]).toBe("beskrivande mått");
    expect(nyckeltalDelar(kpi(kapitel("manad-akutflode.json"), "belaggning"), "manad")).toEqual({ varde: `96,9${HART}%`, delar: ["mars 2026"] });
  });

  it("metaraden: period, omfång, källa, publicering", () => {
    expect(kapitelMetarad(kapitel("ar-skr-tillganglighet.json"), "ar", "2026-03-31"))
      .toEqual(["Årsanalys 2025", "10 indikatorer i 4 avsnitt", "Källa: SKR via Kolada", "Publicerad 31 mar 2026"]);
    expect(kapitelMetarad(kapitel("manad-akutflode.json"), "manad"))
      .toEqual(["Månadsanalys mars 2026", "4 indikatorer", "Källa: Regionens vårddatalager"]);
  });

  it("analysen börjar inte med siffrorna i nyckeltalsraden", () => {
    const tg = kapitel("ar-skr-tillganglighet.json");
    const k = kpi(tg, "kolada-n79179");
    expect(k.analystext.startsWith("Region Halland redovisar")).toBe(true);
    expect(utanUpprepning(k.analystext, k).startsWith("Resultatet ligger")).toBe(true);
    const b = kpi(kapitel("manad-akutflode.json"), "belaggning");
    expect(utanUpprepning(b.analystext, b).startsWith("Beläggningsgrad minskade med 2,4 procent jämfört med föregående månad.")).toBe(true);
    expect(utanUpprepning("Annan text. Med två meningar.", k)).toBe("Annan text. Med två meningar.");
    // Ingen analys i datan börjar med värdet eller platsen efter rensningen
    for (const fil of filer) {
      for (const x of kapitel(fil).kpier) {
        const ut = utanUpprepning(x.analystext, x);
        expect(ut).not.toMatch(/^Region Halland redovisar/);
        expect(ut.startsWith(`${x.namn} ligger på`)).toBe(false);
      }
    }
  });

  it("fördjupningen: faktaunderlag när det finns, annars Kolada-beskrivningen; aldrig em dash", () => {
    const tg = kapitel("ar-skr-tillganglighet.json");
    const f = fordjupningTexter(kpi(tg, "kolada-n79179"), tg, "ar");
    expect(f.matt[0]).toBe(kpi(tg, "kolada-n79179").fakta?.matt);
    expect(f.kalla.map((r) => r.etikett)).toEqual(["Primärkälla", "Huvudman", "Uppdateras", "Vägen till rapporten"]);
    expect(f.kalla[3].varde).toBe("Nationella väntetidsdatabasen (Väntetider i vården) › Vården i siffror › Kolada › rapporten");
    expect(f.faktorer?.lista.length).toBeGreaterThan(0);
    const ko = kapitel("ar-skr-kostnader.json");
    for (const k of ko.kpier) {
      const x = fordjupningTexter(k, ko, "ar");
      expect(x.faktorer).toBeNull();
      expect(x.matt.join(" ")).not.toContain(EM_DASH);
      expect(x.matt.join(" ")).not.toMatch(/Källa:/);
    }
    const ak = kapitel("manad-akutflode.json");
    const a = fordjupningTexter(kpi(ak, "belaggning"), ak, "manad");
    expect(a.matt[1]).toBe("Redovisas för hela regionen och per sjukhus: Halmstad, Varberg och Kungsbacka.");
    expect(a.kalla[0]).toEqual({ etikett: "Primärkälla", varde: "Regionens vårddatalager" });
    expect(beskrivningUtanTitel(`Titel ${EM_DASH} Text om måttet. Källa: Någon`)).toBe("Text om måttet.");
  });

  it("begrepp i kapitlet hittas i kapitlets texter", () => {
    const ids = begreppIKapitlet(kapitel("ar-skr-tillganglighet.json")).map((b) => b.id);
    expect(ids).toContain("rikssnitt");
    expect(ids).toContain("topp-3");
  });
});

// ════════════════════════════════════════════════════════════
//  En uppgift på ett ställe (stilguiden 4.4 och 5.6)
// ════════════════════════════════════════════════════════════

const antal = (html: string, s: string | RegExp) =>
  typeof s === "string" ? html.split(s).length - 1 : (html.match(new RegExp(s, "g")) ?? []).length;

function renderaIndikator(kap: KapitelModell, k: KpiModell, vy: VyId): string {
  return renderToStaticMarkup(<Indikator kpi={k} kapitel={kap} nummer="1.1" vy={vy} latFigur={false} />);
}

describe("indikatorn visar varje uppgift en gång", () => {
  const fall: [string, string][] = [
    ["ar-skr-tillganglighet.json", "kolada-n79179"],
    ["ar-skr-tillganglighet.json", "kolada-n79173"],
    ["ar-skr-kostnader.json", "kolada-n70808"],
    ["manad-akutflode.json", "belaggning"],
    ["dag-akutflode.json", "vantetid"],
  ];

  it.each(fall)("%s %s", (fil, id) => {
    const kap = kapitel(fil);
    const k = kpi(kap, id);
    const html = renderaIndikator(kap, k, vyAv(fil));
    // Status: en markör (rubrikraden), ingen för beskrivande mått
    expect(antal(html, "data-status=")).toBe(k.status ? 1 : 0);
    // Ingen nyckeltalsrad (2026-10-08): värde och plats står i analysen, som visas i sin helhet
    expect(antal(html, "data-nyckeltal")).toBe(0);
    const forsta = k.analystext.trim().split(/(?<=\.)\s/)[0].slice(0, 40);
    // Jämförs utan taggar: begreppen i analysen är knappar
    if (forsta) expect(html.replace(/<[^>]+>/g, ""), "analysens början").toContain(forsta);
    // Namnet i rubriken (h3) och som figurens titel (h4), aldrig som kicker i indikatorn
    expect(html).toMatch(new RegExp(`<h3[^>]*>.*${k.namn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h3>`));
    expect(antal(html, "data-kicker")).toBe(0);
    expect(antal(html, "<h4")).toBe(1);
    expect(html).toMatch(new RegExp(`<h4[^>]*>${k.namn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h4>`));
    // Fördjupningen är stängd och proveniensen står en gång
    expect(html).toMatch(/<details(?![^>]*open)/);
    expect(antal(html, "data-proveniens")).toBe(1);
    expect(html).not.toContain(EM_DASH);
  });

  it("alla indikatorer i alla kapitel: status högst en gång", () => {
    for (const fil of filer) {
      const kap = kapitel(fil);
      for (const k of kap.kpier.slice(0, 3)) {
        expect(antal(renderaIndikator(kap, k, vyAv(fil)), "data-status=")).toBe(k.status ? 1 : 0);
      }
    }
  });
});

describe("kapitelsidan och sammanfattningen", () => {
  it("kapitlet har blocken i ordning med data-block för ramen", () => {
    const kap = skrUtdrag();
    const html = renderToStaticMarkup(<KapitelSida kapitel={kap} vy="ar" latFigur={false} />);
    const block = [...html.matchAll(/data-block="([^"]+)"/g)].map((m) => m[1]);
    const forvantat = [
      ...(kap.huvudpunkter.length ? [KAPITELBLOCK.viktigast] : []),
      KAPITELBLOCK.laget,
      ...kap.avsnitt.flatMap((a) => [a.id, ...a.kpi_ids]),
      ...(kap.avsnitt.length ? [] : kap.kpier.map((k) => k.id)),
      KAPITELBLOCK.om,
    ];
    expect(block).toEqual(forvantat);
    expect(antal(html, "<h1")).toBe(1);
    expect(html).not.toContain(EM_DASH);
  });

  it("sammanfattningen har inga indikatorblock och inga grafer", () => {
    const html = renderToStaticMarkup(<Sammanfattning kapitel={arsKapitel()} vy="ar" publicerad="2026-03-31" />);
    expect(antal(html, "<figure")).toBe(0);
    expect(antal(html, "data-indikator")).toBe(0);
    expect(antal(html, "data-las-kapitlet")).toBe(7);
    expect(antal(html, /<li[ >]/)).toBeLessThanOrEqual(MAX_VIKTIGAST + 7 * 2);
    expect(html).not.toContain(EM_DASH);
  });
});
