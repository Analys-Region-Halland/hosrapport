import { describe, expect, it } from "vitest";
import { tema } from "../design/tema";
import { LASLINJE, RULLMARGINAL, valjAktivt, type BlockLage } from "./scroll";

const b = (id: string, topp: number, synlig = true): BlockLage => ({ id, topp, synlig });

describe("rullmarginal och läslinje", () => {
  it("rullmarginalen är verktygsraden + rum.5, läslinjen en bit under", () => {
    expect(RULLMARGINAL).toBe(tema.matt.verktygsrad + tema.rum[5]);
    expect(LASLINJE).toBeGreaterThan(RULLMARGINAL);
  });
});

describe("valjAktivt", () => {
  it("ovanför första blocket är inget aktivt", () => {
    expect(valjAktivt([b("a", 300), b("b", 900)], LASLINJE)).toBe("");
    expect(valjAktivt([], LASLINJE)).toBe("");
  });

  it("sista blocket vars överkant passerat läslinjen", () => {
    expect(valjAktivt([b("a", -400), b("b", 40), b("c", 600)], LASLINJE)).toBe("b");
  });

  it("ett block som rullats till (överkant vid rullmarginalen) är aktivt", () => {
    expect(valjAktivt([b("a", -900), b("mal", RULLMARGINAL), b("nasta", RULLMARGINAL + 200)], LASLINJE)).toBe("mal");
  });

  it("nästlade block: indikatorn i avsnittet vinner när den passerat linjen", () => {
    const block = [b("avsnitt", -200), b("indikator-1", -150), b("indikator-2", 60), b("indikator-3", 700)];
    expect(valjAktivt(block, LASLINJE)).toBe("indikator-2");
  });

  it("dolda block hoppas över", () => {
    expect(valjAktivt([b("a", -100), b("dold", 0, false), b("c", 900)], LASLINJE)).toBe("a");
  });

  it("vid sidans slut räcker det att överkanten syns", () => {
    const block = [b("a", -500), b("b", 300), b("om-statistiken", 700), b("under", 950)];
    expect(valjAktivt(block, LASLINJE)).toBe("a");
    expect(valjAktivt(block, LASLINJE, { fonsterhojd: 900 })).toBe("om-statistiken");
  });
});
