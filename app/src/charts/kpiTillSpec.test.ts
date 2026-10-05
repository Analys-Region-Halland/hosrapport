import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { akutflodeUtdrag, hierarki, skrUtdrag } from "../data/fixturer";
import { HALLAND_ID, RIKET_ID } from "../data/modell";
import { tema } from "../design/tema";
import type { KapitelModell, KpiModell, VyId } from "../data/modell";
import { normalisera } from "../data/normalisera";
import { kpiTillSpec, minidiagramSpec, specTextfel, visningar } from "./kpiTillSpec";
import type { ChartSpec, SpecKontext, VisningId } from "./spec";
import { antalMeningar } from "./text";

const DATA = fileURLToPath(new URL("../../public/data/", import.meta.url));
const filer = readdirSync(DATA).filter((f) => f.endsWith(".json") && f !== "index.json").sort();
const vyAv = (fil: string) => fil.split("-")[0] as VyId;
const kapitel = filer.map((f) => ({ fil: f, vy: vyAv(f), kap: normalisera(JSON.parse(readFileSync(DATA + f, "utf8")), vyAv(f)) }));
const ALLA_VISNINGAR: VisningId[] = ["tid", "rang", "enheter", "enheterRang"];
const ROLLER = new Set(["fokus", "referens", "kontext", "markerad", "forvantat", "grans", "mal"]);
const NBSP = String.fromCharCode(0xa0);

const hitta = (fil: string, id: string): { kap: KapitelModell; kpi: KpiModell; vy: VyId } => {
  const k = kapitel.find((x) => x.fil === fil);
  const kpi = k?.kap.kpier.find((x) => x.id === id);
  if (!k || !kpi) throw new Error(`saknar ${id}`);
  return { kap: k.kap, kpi, vy: k.vy };
};

/** Kontroller som gäller varje spec. */
function kontrollera(spec: ChartSpec, kpi: KpiModell, namn: string) {
  expect(specTextfel(spec), namn).toEqual([]);
  expect(Object.keys(spec), namn).not.toContain("legend");
  for (const s of spec.serier) expect(ROLLER.has(s.roll), `${namn}: ${s.roll}`).toBe(true);
  // Fokus finns alltid, utom när underliggande enheter rangordnas (aggregatet är då referens).
  if (!spec.id.includes(":enheterRang")) expect(spec.serier.filter((s) => s.roll === "fokus").length, namn).toBeGreaterThan(0);
  // Inga zoner: förväntat intervall bara när datan har det, och då ett band.
  const band = spec.serier.filter((s) => s.roll === "forvantat");
  expect(band.length, namn).toBeLessThanOrEqual(1);
  if (band.length) expect(spec.typ).toBe("linje");
  // Tidsserier ligger på samma rutnät.
  if (spec.typ === "linje" || spec.typ === "stapel" || spec.typ === "smaMultiplar") {
    const langder = new Set(spec.serier.filter((s) => s.punkter).map((s) => s.punkter?.length));
    expect(langder.size, namn).toBe(1);
  }
  if (spec.typ === "stapel") expect(spec.y.noll).toBe(true);
  // Etiketterna pekar på serier som finns.
  const ids = new Set(spec.serier.map((s) => s.id));
  for (const e of spec.etiketter) expect(ids.has(e.serieId), `${namn}: etikett ${e.text}`).toBe(true);
  // Tabellen: lika många celler som kolumner, fokusraden finns.
  for (const r of spec.tabell.rader) expect(r.length, namn).toBe(spec.tabell.kolumner.length);
  if (spec.tabell.fokusRad !== undefined) expect(spec.tabell.rader[spec.tabell.fokusRad]).toBeDefined();
  if (spec.typ !== "minidiagram") expect(spec.tabell.caption).toBe(spec.titel);
  expect(kpi.id).toBe(spec.id.split(":")[0]);
}

describe.each(kapitel)("kpiTillSpec för $fil", ({ kap, vy }) => {
  it("ger en spec för varje indikator och visning utan att kasta", () => {
    for (const kpi of kap.kpier) {
      const vis = visningar(kpi, kap, { vy });
      expect(vis[0].id).toBe("tid");
      expect(vis.length).toBeLessThanOrEqual(4);
      const kontexter: SpecKontext[] = [
        { vy },
        { vy, fristaende: true },
        { vy, fasta: ["0001", "0012", "halmstad", "varberg"] },
      ];
      if (kpi.serier[kpi.fokus].dagar) kontexter.push({ vy, dagar: true });
      for (const ctx of kontexter) {
        for (const v of vis) kontrollera(kpiTillSpec(kpi, kap, ctx, v.id), kpi, `${kpi.id} ${v.id} ${JSON.stringify(ctx)}`);
      }
      kontrollera(minidiagramSpec(kpi, kap, { vy }), kpi, `${kpi.id} mini`);
    }
  });

  it("visningar som datan inte räcker till ger tid", () => {
    for (const kpi of kap.kpier) {
      const finns = new Set(visningar(kpi, kap, { vy }).map((v) => v.id));
      const tid = kpiTillSpec(kpi, kap, { vy }, "tid");
      for (const v of ALLA_VISNINGAR) if (!finns.has(v)) expect(kpiTillSpec(kpi, kap, { vy }, v).typ).toBe(tid.typ);
    }
  });

  it("fristående figur får indikatornamnet som kicker", () => {
    const kpi = kap.kpier[0];
    expect(kpiTillSpec(kpi, kap, { vy, fristaende: true }, "tid").kicker).toBe(kpi.namn);
    expect(kpiTillSpec(kpi, kap, { vy }, "tid").kicker).toBeUndefined();
  });
});

describe("rangordningen", () => {
  const skr = kapitel.filter((k) => k.fil.includes("-skr-"));

  it("ordningen stämmer med rank i datan för alla SKR-indikatorer", () => {
    let antal = 0;
    for (const { kap, vy } of skr) {
      for (const kpi of kap.kpier) {
        const spec = kpiTillSpec(kpi, kap, { vy }, "rang");
        expect(spec.typ).toBe("rangordning");
        const rader = spec.serier.filter((s) => s.roll === "fokus" || s.roll === "kontext" || s.roll === "markerad");
        const fokus = kpi.serier[HALLAND_ID];
        // Sorterad efter riktning.
        const varden = rader.map((r) => r.varde as number);
        const sorterad = [...varden].sort((a, b) => (kpi.riktning === "lag" ? a - b : b - a));
        expect(varden, kpi.id).toEqual(sorterad);
        if (fokus.rank === undefined) {
          expect(rader.every((r) => r.plats === undefined), kpi.id).toBe(true);
          expect(spec.serier.some((s) => s.roll === "grans"), `${kpi.id}: neutrala mått har ingen topp 3`).toBe(false);
          continue;
        }
        antal++;
        const i = rader.findIndex((r) => r.id === HALLAND_ID);
        expect(i + 1, kpi.id).toBe(fokus.rank);
        expect(rader[i].plats, kpi.id).toBe(fokus.rank);
        expect(rader.length, kpi.id).toBe(fokus.rank_av);
        expect(spec.platsAv).toEqual([fokus.rank_av]);
        // Lika värden får samma plats, platserna växer aldrig bakåt.
        for (let j = 1; j < rader.length; j++) {
          expect(rader[j].plats as number).toBeGreaterThanOrEqual(rader[j - 1].plats as number);
          if (rader[j].varde !== rader[j - 1].varde && j !== i && j - 1 !== i) expect(rader[j].plats).toBe(j + 1);
        }
        // Topp 3 som en gränslinje under platserna 1–3.
        const grans = spec.serier.find((s) => s.roll === "grans");
        expect(grans?.varde, kpi.id).toBe(rader.filter((r) => (r.plats as number) <= 3).length);
      }
    }
    expect(antal).toBeGreaterThan(60);
  });

  it("riket är referens och regioner utan värde utelämnas med en not", () => {
    const { kap, kpi, vy } = hitta("ar-skr-tillganglighet.json", "kolada-n79179");
    const spec = kpiTillSpec(kpi, kap, { vy }, "rang");
    expect(spec.serier.find((s) => s.roll === "referens")).toMatchObject({ id: RIKET_ID, namn: "Riket", varde: 88.5 });
    expect(spec.serier.filter((s) => s.roll !== "referens" && s.roll !== "grans")).toHaveLength(19);
    expect(spec.noter.map((n) => n.text)).toContain("Två regioner saknar värde 2025.");
    expect(spec.tabell.rader[spec.tabell.fokusRad as number]).toEqual(["7", "Halland", 89.8]);
  });
});

describe("linje med regioner", () => {
  const { kap, kpi, vy } = hitta("ar-skr-tillganglighet.json", "kolada-n79179");

  it("titel och undertitel enligt stilguiden 6.2", () => {
    const spec = kpiTillSpec(kpi, kap, { vy }, "tid");
    expect(spec.titel).toBe("Halland jämfört med övriga regioner");
    expect(spec.undertitel).toBe("Andelen inkommande telefonsamtal till primärvården som besvarats samma dag, procent. 21 regioner och riket, 2016–2025.");
    expect(kpiTillSpec(kpi, kap, { vy }, "rang").undertitel).toMatch(/\. 19 regioner med värde, 2025\.$/);
    expect(visningar(kpi, kap, { vy })).toEqual([{ id: "tid", etikett: "Över tid" }, { id: "rang", etikett: "Rangordning" }]);
  });

  it("roller, etiketter och jämförbara utan legend", () => {
    const spec = kpiTillSpec(kpi, kap, { vy, fasta: ["0012", "0001"] }, "tid");
    const roll = (r: string) => spec.serier.filter((s) => s.roll === r).map((s) => s.id);
    expect(roll("fokus")).toEqual([HALLAND_ID]);
    expect(roll("referens")).toEqual([RIKET_ID]);
    expect(roll("markerad")).toEqual(["0012", "0001"]);
    expect(spec.serier.find((s) => s.id === "0001")?.markeringIndex).toBe(1);
    expect(roll("kontext")).toHaveLength(18);
    const etiketter = spec.etiketter.map((e) => e.text);
    expect(etiketter.slice(0, 4)).toEqual(["Halland", "Riket", "Skåne", "Stockholm"]);
    expect(etiketter).toHaveLength(6); // plus högsta och lägsta övriga region
    expect(spec.jamforbara?.map((j) => j.enhetId)).not.toContain(HALLAND_ID);
    expect(spec.jamforbara?.map((j) => j.enhetId)).not.toContain(RIKET_ID);
    const namn = spec.jamforbara?.map((j) => j.namn) ?? [];
    expect(namn).toEqual([...namn].sort((a, b) => a.localeCompare(b, "sv")));
    expect(spec.serier.find((s) => s.id === HALLAND_ID)?.punkter?.map((p) => p.varde).slice(7, 9)).toEqual([null, null]);
    expect(spec.noter.map((n) => n.typ)).toEqual(["seriebrott", "lucka"]);
    expect(spec.noter[1].text).toBe("2023 och 2024 saknas för Halland.");
    expect(spec.kalla).toEqual({ namn: "Nationella väntetidsdatabasen (Väntetider i vården), Sveriges Kommuner och Regioner, via Kolada", url: "https://skr.se/vantetiderivarden.html" });
  });

  it("plats per period för tooltipen, Hallands senaste ur datan", () => {
    const spec = kpiTillSpec(kpi, kap, { vy }, "tid");
    const halland = spec.serier.find((s) => s.id === HALLAND_ID);
    expect(halland?.platser?.at(-1)).toBe(7);
    expect(halland?.platser?.[7]).toBeNull();
    expect(spec.platsAv?.at(-1)).toBe(19);
  });

  it("högst fyra fästa; den senast fästa ersätter den äldsta", () => {
    const spec = kpiTillSpec(kpi, kap, { vy, fasta: ["0001", "0003", "0004", "0005", "0006"] }, "tid");
    expect(spec.serier.filter((s) => s.roll === "markerad").map((s) => [s.id, s.markeringIndex])).toEqual([["0003", 0], ["0004", 1], ["0005", 2], ["0006", 3]]);
  });

  it("kronor i undertitel och sammanfattning", () => {
    const k = hitta("ar-skr-kostnader.json", "kolada-u70020");
    const spec = kpiTillSpec(k.kpi, k.kap, { vy }, "tid");
    expect(spec.undertitel).toBe("Strukturjusterad hälso- och sjukvårdskostnad, kronor per invånare. 21 regioner och riket, 2016–2024.");
    expect(spec.sammanfattning).toContain(`34${NBSP}371${NBSP}kr`);
    const n = hitta("ar-skr-kostnader.json", "kolada-n70845");
    expect(kpiTillSpec(n.kpi, n.kap, { vy }, "tid").undertitel)
      .toBe(`Disponibla vårdplatser slutenvård totalt i regionen, antal per 1${NBSP}000 invånare. 21 regioner och riket, 2016–2025.`);
  });
});

describe("intern uppföljning (akutflöde)", () => {
  it("linje mot förväntat intervall: ett band, fokus och etikett där bandet slutar", () => {
    const { kap, kpi, vy } = hitta("manad-akutflode.json", "belaggning");
    const spec = kpiTillSpec(kpi, kap, { vy }, "tid");
    expect(spec.typ).toBe("linje");
    expect(spec.titel).toBe("Mot förväntat intervall");
    expect(spec.undertitel).toBe(`Beläggningsgrad, procent. Region Halland, per månad jan${NBSP}2021–mar${NBSP}2026.`);
    const band = spec.serier.find((s) => s.roll === "forvantat");
    expect(band?.intervall).toHaveLength(63);
    expect(band?.intervall?.at(-1)).toEqual({ x: "2026-03-01", lo: 96.4, hi: 98.6, lo2: 92.5, hi2: 102.4 });
    expect(spec.etiketter.map((e) => e.text)).toEqual(["Halland", "Förväntat intervall"]);
    expect(visningar(kpi, kap, { vy })).toEqual([
      { id: "tid", etikett: "Region Halland" },
      { id: "enheter", etikett: "Per sjukhus" },
      { id: "enheterRang", etikett: "Sjukhusen rangordnade" },
    ]);
  });

  it("summamått med högst 24 perioder blir staplar från noll", () => {
    const { kap, kpi } = hitta("kvartal-akutflode.json", "akutbesok");
    const spec = kpiTillSpec(kpi, kap, { vy: "kvartal" }, "tid");
    expect(spec.typ).toBe("stapel");
    expect(spec.titel).toBe("Över tid");
    expect(spec.y.noll).toBe(true);
    expect(spec.undertitel).toBe(`Besök akutmottagning, antal per kvartal. Region Halland, kv.${NBSP}1${NBSP}2021–kv.${NBSP}1${NBSP}2026.`);
    // Över 24 perioder blir det linje.
    const m = hitta("manad-akutflode.json", "akutbesok");
    expect(kpiTillSpec(m.kpi, m.kap, { vy: "manad" }, "tid").typ).toBe("linje");
  });

  it("dagsdata ger dagens rutnät", () => {
    const { kap, kpi } = hitta("manad-akutflode.json", "vantetid");
    const spec = kpiTillSpec(kpi, kap, { vy: "manad", dagar: true }, "tid");
    expect(spec.id).toBe("vantetid:tid:dagar");
    expect(spec.serier.find((s) => s.roll === "fokus")?.punkter).toHaveLength(31);
    expect(spec.undertitel.endsWith(`per dag 1${NBSP}mar${NBSP}2026–31${NBSP}mar${NBSP}2026.`), spec.undertitel).toBe(true);
  });

  it("små multiplar: delad skala, referens bara för andel och medel", () => {
    const { kap, kpi, vy } = hitta("manad-akutflode.json", "belaggning");
    const spec = kpiTillSpec(kpi, kap, { vy }, "enheter");
    expect(spec.typ).toBe("smaMultiplar");
    expect(spec.titel).toBe("Per sjukhus");
    // Lägre beläggning är bättre: bäst först (stilguiden 6.6)
    expect(spec.paneler?.map((p) => p.titel)).toEqual(["Kungsbacka", "Varberg", "Halmstad"]);
    expect(spec.serier.find((s) => s.roll === "referens")?.id).toBe(HALLAND_ID);
    const alla = spec.serier.flatMap((s) => s.punkter ?? []).map((p) => p.varde).filter((v): v is number => v !== null);
    expect(spec.y.doman).toEqual([Math.min(...alla), Math.max(...alla)]);
    const besok = hitta("manad-akutflode.json", "akutbesok");
    const summa = kpiTillSpec(besok.kpi, besok.kap, { vy }, "enheter");
    expect(summa.serier.some((s) => s.roll === "referens")).toBe(false);
    expect(summa.undertitel).toContain("Tre sjukhus i Region Halland");
  });
});

describe("påhittad hierarki och utdrag", () => {
  const h = hierarki();
  const ater = h.kpier.find((k) => k.id === "demo-aterinskrivning") as KpiModell;

  it("nedborrning: region, sjukhus, avdelning", () => {
    expect(visningar(ater, h, { vy: "manad" }).map((v) => v.etikett)).toEqual(["Region Halland", "Per sjukhus", "Sjukhusen rangordnade"]);
    expect(visningar(ater, h, { vy: "manad", fokus: "halmstad" }).map((v) => v.etikett)).toEqual(["Hallands sjukhus Halmstad", "Per avdelning", "Avdelningarna rangordnade"]);
    const avd = kpiTillSpec(ater, h, { vy: "manad", fokus: "halmstad" }, "enheter");
    expect(avd.titel).toBe("Per avdelning");
    expect(avd.paneler).toHaveLength(4);
    const tid = kpiTillSpec(ater, h, { vy: "manad", fokus: "halmstad" }, "tid");
    expect(tid.serier.find((s) => s.roll === "referens")?.id).toBe(HALLAND_ID);
    expect(tid.jamforbara?.map((j) => j.namn)).toEqual(["Kungsbacka", "Varberg"]);
  });

  it("undertryckta värden: lucka i grafen, .. i tabellen och not", () => {
    const spec = kpiTillSpec(ater, h, { vy: "manad", fokus: "kungsbacka" }, "enheter");
    expect(spec.tabell.rader.flat()).toContain("..");
    expect(spec.noter.find((n) => n.typ === "undertryckt")?.text).toBe("Värden baserade på färre än 10 fall visas inte.");
    const p = spec.serier.flatMap((s) => s.punkter ?? []).filter((q) => q.undertryckt);
    expect(p.length).toBeGreaterThan(0);
    expect(p.every((q) => q.varde === null)).toBe(true);
  });

  it("alla visningar i alla nivåer klarar textreglerna", () => {
    const fokusar = [undefined, ...h.enheter.filter((e) => e.niva !== "region").map((e) => e.id)];
    for (const kpi of h.kpier) for (const fokus of fokusar) {
      const ctx: SpecKontext = { vy: "manad", fokus };
      for (const v of visningar(kpi, h, ctx)) kontrollera(kpiTillSpec(kpi, h, ctx, v.id), kpi, `${kpi.id} ${fokus} ${v.id}`);
    }
  });

  it("utdragen normaliseras och ger specar", () => {
    for (const kap of [skrUtdrag(), akutflodeUtdrag()]) {
      const vy: VyId = kap.id.startsWith("skr") ? "ar" : "manad";
      for (const kpi of kap.kpier) for (const v of visningar(kpi, kap, { vy })) kontrollera(kpiTillSpec(kpi, kap, { vy }, v.id), kpi, `${kpi.id} ${v.id}`);
    }
  });
});

describe("tema", () => {
  it("varje serieroll har färg, bredd och streckning i tema.ts", () => {
    for (const r of ROLLER) {
      expect(tema.diagram.roll, r).toHaveProperty(r);
      const t = tema.diagram.roll[r as keyof typeof tema.diagram.roll];
      expect(t).toHaveProperty("farg");
      expect(t).toHaveProperty("bredd");
      expect(t).toHaveProperty("streck");
    }
  });
});

describe("text", () => {
  it("räknar meningar utan att fastna på förkortningar", () => {
    expect(antalMeningar(`Andel, procent. Region Halland, per kvartal kv.${NBSP}1 2021–kv.${NBSP}1 2026.`)).toBe(2);
    expect(antalMeningar(`Antal per 100${NBSP}000 invånare. 21 regioner och riket, 2016–2025.`)).toBe(2);
    expect(antalMeningar(`Skillnaden är 2,1${NBSP}p.e. Mot riket.`)).toBe(1);
    expect(antalMeningar("En mening. Två meningar. Tre.")).toBe(3);
    expect(antalMeningar("Utan punkt")).toBe(1);
    expect(antalMeningar(`Andel, procent. Region Halland, per kvartal kv.${NBSP}1${NBSP}2021–kv.${NBSP}1${NBSP}2026.`)).toBe(2);
  });
});

describe("rättelser i WP3", () => {
  const telefon = hitta("ar-skr-tillganglighet.json", "kolada-n79179");
  const akut = hitta("manad-akutflode.json", "belaggning");
  const h = hierarki();
  const ater = h.kpier.find((k) => k.id === "demo-aterinskrivning") as KpiModell;

  it("jämförnivån står i specen: region för regioner, enhetens nivå för syskon", () => {
    expect(kpiTillSpec(telefon.kpi, telefon.kap, { vy: "ar" }, "tid").jamforNiva).toEqual({ id: "region", etikett: "region" });
    expect(kpiTillSpec(telefon.kpi, telefon.kap, { vy: "ar" }, "rang").jamforNiva).toEqual({ id: "region", etikett: "region" });
    const sjukhus = kpiTillSpec(ater, h, { vy: "manad", fokus: "halmstad" }, "tid");
    expect(sjukhus.jamforbara?.length).toBeGreaterThan(0);
    expect(sjukhus.jamforNiva).toEqual({ id: "sjukhus", etikett: "sjukhus" });
    const avdelning = kpiTillSpec(ater, h, { vy: "manad", fokus: "halmstad-kirurgi" }, "tid");
    expect(avdelning.jamforNiva).toEqual({ id: "avdelning", etikett: "avdelning" });
    // Utan jämförbara ingen nivå
    expect(kpiTillSpec(akut.kpi, akut.kap, { vy: "manad" }, "tid").jamforNiva).toBeUndefined();
  });

  it("rangordningen har sin period", () => {
    expect(kpiTillSpec(telefon.kpi, telefon.kap, { vy: "ar" }, "rang").period).toEqual({ iso: "2025-01-01", vy: "ar", text: "2025" });
    expect(kpiTillSpec(akut.kpi, akut.kap, { vy: "manad" }, "enheterRang").period).toEqual({ iso: "2026-03-01", vy: "manad", text: `mar${NBSP}2026` });
  });

  it("periodtexter bryts inte: hårt mellanslag i undertitel, not och tabellhuvud", () => {
    // En period med vanligt mellanslag före årtalet: "mar 2026", "kv.[hårt]1 2026", "v.[hårt]12 2026"
    const brytbar = new RegExp(`\\b(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec|kv\\.${NBSP}\\d|v\\.${NBSP}\\d+) \\d`);
    for (const { kap, vy } of kapitel) {
      for (const kpi of kap.kpier) {
        for (const v of visningar(kpi, kap, { vy })) {
          const spec = kpiTillSpec(kpi, kap, { vy }, v.id);
          const texter = [spec.undertitel, ...spec.noter.map((n) => n.text), ...spec.tabell.kolumner];
          for (const t of texter) expect(t, `${kpi.id} ${v.id}`).not.toMatch(brytbar);
        }
      }
    }
  });

  it("år som ingen region mätte (enkät vartannat år) är inga luckor", () => {
    const enkat = hitta("ar-skr-syn-pa-varden.json", "kolada-n79171");
    const spec = kpiTillSpec(enkat.kpi, enkat.kap, { vy: "ar" }, "tid");
    expect(spec.noter.filter((n) => n.typ === "lucka")).toEqual([]);
    expect(spec.sammanfattning).not.toContain("saknas");
    // Riktiga luckor (andra regioner har värden) står kvar
    const gles = hitta("ar-skr-syn-pa-varden.json", "kolada-u71451");
    expect(kpiTillSpec(gles.kpi, gles.kap, { vy: "ar" }, "tid").noter.find((n) => n.typ === "lucka")?.text)
      .toBe("2018, 2020, 2022 och 2024 saknas för Halland.");
    // Minidiagrammet tar bara med mätta perioder
    const mini = minidiagramSpec(enkat.kpi, enkat.kap, { vy: "ar" });
    expect(mini.serier[0].punkter?.map((p) => p.period.slice(0, 4))).toEqual(["2016", "2022", "2024"]);
    expect(minidiagramSpec(telefon.kpi, telefon.kap, { vy: "ar" }).serier[0].punkter?.filter((p) => p.varde === null)).toHaveLength(2);
  });

  it("små multiplar: panelerna bäst först enligt riktningen, efter värde för neutrala mått", () => {
    let antal = 0;
    for (const { kap, vy } of [...kapitel, { kap: h, vy: "manad" as VyId }]) {
      for (const kpi of kap.kpier) {
        if (!visningar(kpi, kap, { vy }).some((v) => v.id === "enheter")) continue;
        const spec = kpiTillSpec(kpi, kap, { vy }, "enheter");
        // Senaste värdet i datan (inte index, som summamått med olika storlek visas som)
        const senaste = (spec.paneler ?? []).map((p) =>
          [...(kpi.serier[p.enhetId]?.tidsserie ?? [])].reverse().find((q) => q.varde !== null)?.varde ?? null,
        ).filter((v): v is number => v !== null);
        const sorterad = [...senaste].sort((a, b) => (kpi.riktning === "lag" ? a - b : b - a));
        expect(senaste, kpi.id).toEqual(sorterad);
        // Serierna och tabellens kolumner i samma ordning som panelerna
        expect(spec.serier.filter((s) => s.roll === "fokus").map((s) => s.enhetId)).toEqual(spec.paneler?.map((p) => p.enhetId));
        antal++;
      }
    }
    expect(antal).toBeGreaterThan(3);
  });
});
