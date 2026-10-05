import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { laddaKapitel, laddaManifest } from "./laddning";

const DATA = fileURLToPath(new URL("../../public/data/", import.meta.url));

describe("laddning", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("hämtar samma URL:er som gamla load.ts, normaliserar och cachar", async () => {
    const hamtade: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      hamtade.push(url);
      const fil = url.split("/").pop() as string;
      return new Response(readFileSync(DATA + fil, "utf8"), { status: 200 });
    });
    const manifest = await laddaManifest();
    expect(manifest.manad?.sektioner.map((s) => s.id)).toEqual(["akutflode"]);
    const kap = await laddaKapitel("manad", "akutflode");
    expect(kap.kpier.map((k) => k.id)).toEqual(["belaggning", "akutbesok", "vantetid", "ambulans"]);
    expect(await laddaKapitel("manad", "akutflode")).toBe(kap);
    expect(hamtade).toEqual(["/data/index.json", "/data/manad-akutflode.json"]);
  });

  it("ger ett begripligt fel när servern svarar med HTML", async () => {
    vi.stubGlobal("fetch", async () => new Response("<!doctype html>", { status: 200 }));
    await expect(laddaKapitel("ar", "finns-inte")).rejects.toThrow(/svarade med HTML/);
  });
});
