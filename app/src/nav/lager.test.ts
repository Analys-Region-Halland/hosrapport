import { describe, expect, it, vi } from "vitest";
import { antalLager, arOverst, oppnaLager, registreraLager, skapaLagerstapel, stangOverstaLager, type Tangenthandelse } from "./lager";

function tangent(key: string, extra: Partial<Tangenthandelse> = {}) {
  const e = {
    key, defaultPrevented: false, isComposing: false, stoppad: false, ...extra,
    preventDefault() { e.defaultPrevented = true; },
    stopImmediatePropagation() { e.stoppad = true; },
  };
  return e;
}

describe("lagerstapeln", () => {
  it("Escape stänger bara det översta lagret, ett i taget", () => {
    const s = skapaLagerstapel();
    const stangda: string[] = [];
    s.registrera(() => stangda.push("ark"));
    s.registrera(() => stangda.push("popover"));
    s.registrera(() => stangda.push("meny"));

    const e1 = tangent("Escape");
    s.hanteraTangent(e1);
    expect(stangda).toEqual(["meny"]);
    expect(e1.defaultPrevented).toBe(true);
    expect(e1.stoppad).toBe(true);
    expect(s.antal()).toBe(2);

    s.hanteraTangent(tangent("Escape"));
    expect(stangda).toEqual(["meny", "popover"]);
    s.hanteraTangent(tangent("Escape"));
    expect(stangda).toEqual(["meny", "popover", "ark"]);
    expect(s.antal()).toBe(0);
  });

  it("utan öppna lager gör Escape ingenting och hindrar inte standardbeteendet", () => {
    const s = skapaLagerstapel();
    const e = tangent("Escape");
    s.hanteraTangent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(e.stoppad).toBe(false);
    expect(s.stangOversta()).toBe(false);
  });

  it("andra tangenter stänger inget", () => {
    const s = skapaLagerstapel();
    let stangd = 0;
    s.registrera(() => stangd++);
    for (const key of ["Enter", "Tab", "Esc ", "ArrowDown", " "]) s.hanteraTangent(tangent(key));
    expect(stangd).toBe(0);
    expect(s.antal()).toBe(1);
  });

  it("Escape som en komponent redan hanterat (preventDefault) lämnas ifred", () => {
    const s = skapaLagerstapel();
    let stangd = 0;
    s.registrera(() => stangd++);
    s.hanteraTangent(tangent("Escape", { defaultPrevented: true }));
    expect(stangd).toBe(0);
  });

  it("Escape under IME-inmatning räknas inte", () => {
    const s = skapaLagerstapel();
    let stangd = 0;
    s.registrera(() => stangd++);
    s.hanteraTangent(tangent("Escape", { isComposing: true }));
    expect(stangd).toBe(0);
  });

  it("avregistrering tar bort lagret var det än ligger i stapeln", () => {
    const s = skapaLagerstapel();
    const stangda: string[] = [];
    s.registrera(() => stangda.push("a"));
    const taBortB = s.registrera(() => stangda.push("b"));
    s.registrera(() => stangda.push("c"));
    taBortB();
    expect(s.antal()).toBe(2);
    s.hanteraTangent(tangent("Escape"));
    s.hanteraTangent(tangent("Escape"));
    expect(stangda).toEqual(["c", "a"]);
  });

  it("lagret är borttaget innan stang anropas, och den senare avregistreringen är en tom operation", () => {
    const s = skapaLagerstapel();
    let antalUnderStang = -1;
    const taBortA = s.registrera(() => {});
    const taBortB = s.registrera(() => { antalUnderStang = s.antal(); });
    s.hanteraTangent(tangent("Escape"));
    expect(antalUnderStang).toBe(1);
    taBortB();
    taBortB();
    expect(s.antal()).toBe(1);
    taBortA();
    expect(s.antal()).toBe(0);
  });

  it("två snabba Escape stänger två lager även om komponenterna inte hunnit avregistrera sig", () => {
    const s = skapaLagerstapel();
    const stangda: number[] = [];
    s.registrera(() => stangda.push(1));
    s.registrera(() => stangda.push(2));
    s.hanteraTangent(tangent("Escape"));
    s.hanteraTangent(tangent("Escape"));
    expect(stangda).toEqual([2, 1]);
  });

  it("ett lager som öppnas medan ett annat stängs hamnar överst", () => {
    const s = skapaLagerstapel();
    const stangda: string[] = [];
    s.registrera(() => {
      stangda.push("meny");
      s.registrera(() => stangda.push("dialog"));
    });
    s.hanteraTangent(tangent("Escape"));
    expect(s.antal()).toBe(1);
    s.hanteraTangent(tangent("Escape"));
    expect(stangda).toEqual(["meny", "dialog"]);
  });

});

describe("arOverst", () => {
  it("säger om lagret med en viss stängfunktion ligger överst", () => {
    const s = skapaLagerstapel();
    const a = () => {};
    const b = () => {};
    expect(s.arOverst(a)).toBe(false);
    s.registrera(a);
    expect(s.arOverst(a)).toBe(true);
    const taBortB = s.registrera(b);
    expect(s.arOverst(a)).toBe(false);
    expect(s.arOverst(b)).toBe(true);
    taBortB();
    expect(s.arOverst(a)).toBe(true);
    s.hanteraTangent(tangent("Escape"));
    expect(s.arOverst(a)).toBe(false);
  });
});

describe("den gemensamma stapeln", () => {
  it("registreraLager och oppnaLager delar stapel; fungerar utan document", () => {
    const stangda: string[] = [];
    const taBortA = registreraLager(() => stangda.push("a"));
    const b = () => stangda.push("b");
    oppnaLager(b);
    expect(antalLager()).toBe(2);
    expect(arOverst(b)).toBe(true);
    expect(stangOverstaLager()).toBe(true);
    expect(stangda).toEqual(["b"]);
    taBortA();
    expect(antalLager()).toBe(0);
    expect(stangOverstaLager()).toBe(false);
  });
});

describe("lyssnaren på window", () => {
  it("fångstfasen på window: Escape stänger det översta lagret och stoppar händelsen", () => {
    const fonster = new EventTarget();
    vi.stubGlobal("window", fonster);
    try {
      const stangda: string[] = [];
      const taBortA = registreraLager(() => stangda.push("a"));
      registreraLager(() => stangda.push("b"));
      let efter = 0;
      fonster.addEventListener("keydown", () => efter++);

      const escape = () => {
        const e = new Event("keydown", { cancelable: true });
        Object.defineProperty(e, "key", { value: "Escape" });
        fonster.dispatchEvent(e);
        return e;
      };
      const e1 = escape();
      expect(stangda).toEqual(["b"]);
      expect(e1.defaultPrevented).toBe(true);
      expect(efter).toBe(0);

      taBortA();
      const e2 = escape();
      expect(stangda).toEqual(["b"]);
      expect(e2.defaultPrevented).toBe(false);
      expect(efter).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("WP5:s och WP4:s ingångar är samma stapel", async () => {
    const lokal = await import("../ui/lagerLokal");
    const wp4 = await import("../ui/lager");
    expect(lokal.registreraLager).toBe(registreraLager);
    expect(lokal.arOverst).toBe(arOverst);
    expect(wp4.registreraLager).toBe(registreraLager);
  });
});
