import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { RaManifest, RaManifestVy, RaSektionSummering } from "../data/kontrakt";
import { TEMAN, type KategoriDef } from "../data/kapitelinfo";
import type { VyId } from "../data/modell";
import {
  antalIndikatorer, antalMedStatus, byggStartModell, forstaMeningen, OVRIGT_ID, summeraStatus, taktText,
} from "./startModell";

const MANIFEST = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../public/data/index.json", import.meta.url)), "utf8"),
) as RaManifest;

function sektion(id: string, status: RaSektionSummering["status"], n_kpier = status.gron + status.gul + status.rod): RaSektionSummering {
  return { id, namn: `Namn ${id}`, n_kpier, n_delar: 0, status };
}

function vy(v: VyId, sektioner: RaSektionSummering[]): RaManifestVy {
  return { vy: v, etikett: "", period: "", datum: "", uppdaterad: "", jmf_etikett: "", analys: "", sektioner };
}

function omrade(id: string, extra: Partial<KategoriDef["omraden"][number]> = {}): KategoriDef["omraden"][number] {
  return {
    id,
    namn: `Info ${id}`,
    beskrivning: `Första meningen om ${id}. Andra meningen.`,
    datatyp: "oppen",
    kalla: `Källa ${id}`,
    takt: "Årsvis",
    jamforelse: "21 regioner och riket",
    ...extra,
  };
}

const TESTTEMAN: KategoriDef[] = [
  { id: "a", namn: "Tema A", kicker: "", beskrivning: "Tema A i en mening. Och en till.", omraden: [omrade("k1"), omrade("k2")] },
  { id: "b", namn: "Tema B", kicker: "", beskrivning: "Tema B.", omraden: [omrade("saknas")] },
  { id: "c", namn: "Tema C", kicker: "", beskrivning: "Tema C.", omraden: [omrade("k3", { takt: "Dagligen", notis: "Exempeldata." })] },
];

describe("summeraStatus", () => {
  it("summerar per status och räknar saknade värden som noll", () => {
    expect(summeraStatus([{ gron: 1, gul: 2, rod: 3 }, { gron: 4 }, null, undefined, { gul: Number.NaN, rod: -2 }]))
      .toEqual({ gron: 5, gul: 2, rod: 3 });
    expect(summeraStatus([])).toEqual({ gron: 0, gul: 0, rod: 0 });
  });

  it("antalMedStatus är summan av de tre", () => {
    expect(antalMedStatus({ gron: 29, gul: 20, rod: 31 })).toBe(80);
  });
});

describe("texter", () => {
  it("forstaMeningen tar första meningen och lämnar en ensam mening orörd", () => {
    expect(forstaMeningen("Det som ska hända. Riktlinjer på ena sidan.")).toBe("Det som ska hända.");
    expect(forstaMeningen("Bara en mening.")).toBe("Bara en mening.");
    expect(forstaMeningen("Kapitel 2 av 6 · SKR:s rapport")).toBe("Kapitel 2 av 6 · SKR:s rapport");
  });

  it("taktText gör första ordet till adjektiv med liten bokstav", () => {
    expect(taktText("Årsvis")).toBe("årlig");
    expect(taktText("Årsvis (källan månadsvis)")).toBe("årlig (källan månadsvis)");
    expect(taktText("Dagligen")).toBe("daglig");
    expect(taktText("Okänd takt")).toBe("okänd takt");
    expect(taktText("")).toBe("");
  });

  it("antalIndikatorer böjer efter antal", () => {
    expect(antalIndikatorer(1)).toBe("1 indikator");
    expect(antalIndikatorer(14)).toBe("14 indikatorer");
  });
});

describe("byggStartModell", () => {
  const manifest: RaManifest = {
    ar: vy("ar", [
      sektion("k1", { gron: 1, gul: 1, rod: 0 }),
      sektion("okand", { gron: 0, gul: 0, rod: 1 }),
      sektion("k2", { gron: 0, gul: 0, rod: 0 }, 3),
      sektion("k3", { gron: 2, gul: 0, rod: 2 }),
    ]),
    manad: vy("manad", [sektion("k3", { gron: 3, gul: 1, rod: 0 }), sektion("bara-manad", { gron: 1, gul: 0, rod: 0 })]),
  };
  const m = byggStartModell(manifest, TESTTEMAN);

  it("Läget just nu är summan av kapitelraderna, var och en i den vy raden leder till", () => {
    // k1 och okand i årsvyn, k3 och bara-manad i månadsvyn, k2 utan status
    expect(m.lage).toEqual({ gron: 5, gul: 2, rod: 1 });
    expect(m.lage).toEqual(summeraStatus(m.teman.flatMap((t) => t.kapitel.map((k) => k.status))));
  });

  it("grupperar per tema i kapitelinfos ordning och hoppar över tema utan kapitel i manifestet", () => {
    expect(m.teman.map((t) => t.id)).toEqual(["a", "c", OVRIGT_ID]);
    expect(m.teman[0].kapitel.map((k) => k.id)).toEqual(["k1", "k2"]);
    expect(m.teman[0].mening).toBe("Tema A i en mening.");
  });

  it("lägger kapitel som saknas i kapitelinfo i Övrigt, i manifestets ordning", () => {
    const ovrigt = m.teman.at(-1)!;
    expect(ovrigt.namn).toBe("Övrigt");
    expect(ovrigt.kapitel.map((k) => k.id)).toEqual(["okand", "bara-manad"]);
    expect(ovrigt.kapitel[0]).toMatchObject({ namn: "Namn okand", dek: "", meta: ["1 indikator"], vy: "ar" });
    expect(ovrigt.kapitel[1]).toMatchObject({ vy: "manad", status: { gron: 1, gul: 0, rod: 0 } });
  });

  it("numrerar löpande över hela förteckningen", () => {
    expect(m.teman.flatMap((t) => t.kapitel.map((k) => `${k.nummer} ${k.id}`)))
      .toEqual(["1 k1", "2 k2", "3 k3", "4 okand", "5 bara-manad"]);
  });

  it("hämtar kapitlets siffror ur vyn länken leder till, som en adress utan vy (månadsvyn när den finns)", () => {
    const k3 = m.teman[1].kapitel[0];
    expect(k3).toMatchObject({ vy: "manad", status: { gron: 3, gul: 1, rod: 0 }, antal: 4 });
    expect(m.teman[0].kapitel[0]).toMatchObject({ id: "k1", vy: "ar" });
  });

  it("bygger dek, metarad och notis ur kapitelinfo och namnet ur manifestet", () => {
    const [k1] = m.teman[0].kapitel;
    expect(k1).toMatchObject({ namn: "Namn k1", dek: "Första meningen om k1.", meta: ["2 indikatorer", "årlig", "Källa k1"] });
    expect(k1.notis).toBeUndefined();
    expect(m.teman[1].kapitel[0]).toMatchObject({ meta: ["4 indikatorer", "daglig", "Källa k3"], notis: "Exempeldata." });
  });

  it("kapitel utan status får en tom räkning (ingen mätare)", () => {
    const k2 = m.teman[0].kapitel[1];
    expect(k2.antal).toBe(3);
    expect(antalMedStatus(k2.status)).toBe(0);
  });

  it("rapportens manifest ger 27 i fas, 21 bevaka och 29 avvikelse i sju kapitel (beskrivande mått räknas inte)", () => {
    const r = byggStartModell(MANIFEST, TEMAN);
    // SKR-kapitlen i årsvyn, akutflödet i månadsvyn (KAPITELVY)
    expect(r.lage).toEqual({ gron: 27, gul: 21, rod: 29 });
    expect(r.teman.map((t) => t.id)).toEqual(["patienten", "kvalitet", "resultat", "internt"]);
    const kapitel = r.teman.flatMap((t) => t.kapitel);
    expect(kapitel.map((k) => k.nummer)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(kapitel.map((k) => k.vy)).toEqual(["ar", "ar", "ar", "ar", "ar", "ar", "manad"]);
    expect(kapitel[6]).toMatchObject({ id: "akutflode", status: { gron: 3, gul: 1, rod: 0 } });
    expect(kapitel[0].meta).toEqual(["14 indikatorer", "årlig", "Hälso- och sjukvårdsbarometern, Nationell patientenkät"]);
    expect(summeraStatus(kapitel.map((k) => k.status))).toEqual(r.lage);
  });

  it("tål ett tomt manifest", () => {
    expect(byggStartModell({}, TEMAN)).toEqual({ lage: { gron: 0, gul: 0, rod: 0 }, teman: [] });
  });
});
