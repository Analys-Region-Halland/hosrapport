import { describe, expect, it, vi } from "vitest";

// useEffect körs här direkt av testet: kroken anropas utan React, och
// effekten (registreringen) och dess städning körs för hand.
type Effekt = () => void | (() => void);
const effekter: Effekt[] = [];
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (f: Effekt) => { effekter.push(f); },
}));

const { antalLager, arOverst } = await import("../nav/lager");
const { useLager } = await import("./lager");

describe("useLager", () => {
  it("lägger exakt stängfunktionen i nav/lager.ts stapel, så att arOverst svarar för den", () => {
    const stang = () => {};
    const fore = antalLager();
    useLager(true, stang);
    const stad = effekter.pop()!();
    expect(antalLager()).toBe(fore + 1);
    expect(arOverst(stang)).toBe(true);
    (stad as () => void)();
    expect(arOverst(stang)).toBe(false);
    expect(antalLager()).toBe(fore);
  });

  it("registrerar inget när lagret är stängt", () => {
    const fore = antalLager();
    useLager(false, () => {});
    expect(effekter.pop()!()).toBeUndefined();
    expect(antalLager()).toBe(fore);
  });
});
