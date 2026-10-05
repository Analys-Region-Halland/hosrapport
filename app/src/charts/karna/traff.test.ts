import { describe, expect, it } from "vitest";
import { avstandTillSegment, STANDARDREGLER, valjLinje, type Polylinje } from "./traff";

const linje = (serieId: string, punkter: [number, number][], foretrade = false): Polylinje => ({
  serieId,
  segment: punkter.slice(1).map((p, i) => [punkter[i][0], punkter[i][1], p[0], p[1]] as [number, number, number, number]),
  ensamma: [],
  foretrade,
});

describe("avstånd till linjesegment", () => {
  it("mäter vinkelrätt mot segmentet, inte lodrätt", () => {
    // Brant linje från (0,0) till (10,100): lodrätt avstånd från (5,20) är 30,
    // verkligt avstånd är litet.
    const d = avstandTillSegment(5, 20, 0, 0, 10, 100);
    expect(d).toBeLessThan(3.1);
    expect(d).toBeGreaterThan(2.9);
  });
  it("mäter till närmaste ändpunkt utanför segmentet", () => {
    expect(avstandTillSegment(-3, -4, 0, 0, 10, 0)).toBeCloseTo(5);
  });
});

describe("träfftest med tröghet (stilguiden 6.8)", () => {
  it("lyfter en linje inom 8 px men inte längre bort", () => {
    const l = [linje("a", [[0, 50], [100, 50]])];
    expect(valjLinje(l, 50, 58, null)).toBe("a");
    expect(valjLinje(l, 50, 58.5, null)).toBeNull();
  });

  it("håller kvar en brant linje när pekaren rör sig längs den", () => {
    // En brant linje (nästan lodrät) och en flack linje som korsar dess väg.
    const brant = linje("brant", [[100, 0], [110, 200]]);
    const flack = linje("flack", [[0, 120], [300, 130]]);
    let nu: string | null = null;
    const spar: (string | null)[] = [];
    let utanTroghet = 0;
    for (let y = 10; y <= 190; y += 2) {
      // pekaren följer den branta linjen 3 px till höger om den och korsar den flacka
      const x = 100 + (10 * y) / 200 + 3;
      nu = valjLinje([brant, flack], x, y, nu);
      spar.push(nu);
      if (valjLinje([brant, flack], x, y, null) === "flack") utanTroghet++;
    }
    expect(spar.every((s) => s === "brant")).toBe(true);
    // Utan tröghet hade den flacka linjen tagit över där linjerna korsar
    expect(utanTroghet).toBeGreaterThan(0);
  });

  it("byter först när en annan linje är minst 4 px närmare", () => {
    const a = linje("a", [[0, 50], [100, 50]]);
    const b = linje("b", [[0, 60], [100, 60]]);
    // a lyft; pekaren vid y = 56: a på 6 px, b på 4 px, skillnad 2 → a står kvar
    expect(valjLinje([a, b], 50, 56, "a")).toBe("a");
    // y = 57: a 7, b 3, skillnad 4 → byte
    expect(valjLinje([a, b], 50, 57, "a")).toBe("b");
    // utan tröghet hade b vunnit redan vid 56
    expect(valjLinje([a, b], 50, 56, null)).toBe("b");
  });

  it("släpper en lyft linje först efter 14 px", () => {
    const l = [linje("a", [[0, 50], [100, 50]])];
    expect(valjLinje(l, 50, 50 + STANDARDREGLER.slapp, "a")).toBe("a");
    expect(valjLinje(l, 50, 50 + STANDARDREGLER.slapp + 0.5, "a")).toBeNull();
  });

  it("ger fokus, referens och fästa 2 px företräde", () => {
    const kontext = linje("kontext", [[0, 50], [100, 50]]);
    const fokus = linje("fokus", [[0, 61], [100, 61]], true);
    // pekaren 5 px från kontext och 6 px från fokus: fokus räknas som 4 px
    expect(valjLinje([kontext, fokus], 50, 55, null)).toBe("fokus");
  });
});
